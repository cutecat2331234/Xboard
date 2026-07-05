<?php

namespace App\Services;

use App\Models\ServerProvisioning;
use phpseclib3\Crypt\Common\AsymmetricKey;
use phpseclib3\Crypt\PublicKeyLoader;
use phpseclib3\Net\SSH2;
use RuntimeException;

/**
 * ProvisioningService — thin, security-focused wrapper around phpseclib SSH.
 *
 * Responsibilities:
 *  - Connect via password OR private key (optionally passphrase-protected).
 *  - TOFU host-key verification: record fingerprint on first connect; verify on retries.
 *  - Execute a command (we only ever run our own install.sh) and collect output + exit code.
 *  - Redact credentials / tokens from any captured output before it is persisted.
 *  - Connection + command timeouts.
 *  - "Use once, then burn": the connection object lives only for the life of this service
 *    instance; credentials are passed in, used, and never written anywhere.
 *
 * IMPORTANT: This class NEVER writes credentials to disk, DB, cache, or logs. The caller
 * (ProvisionNodeJob) is responsible for sourcing credentials from a short-TTL encrypted
 * cache entry and forgetting that entry as early as possible.
 */
class ProvisioningService
{
    /** Default per-command timeout (seconds). install.sh download + systemd start can be slow. */
    public const DEFAULT_COMMAND_TIMEOUT = 300;

    /** Connection establishment timeout (seconds). */
    public const DEFAULT_CONNECT_TIMEOUT = 20;

    private ?SSH2 $ssh = null;

    private string $host;
    private int $port;

    public function __construct(string $host, int $port = 22, int $connectTimeout = self::DEFAULT_CONNECT_TIMEOUT)
    {
        $this->host = $host;
        $this->port = $port;
        $this->ssh = new SSH2($host, $port, $connectTimeout);
        // setTimeout governs read/exec blocking; raised per-command via runCommand().
        $this->ssh->setTimeout($connectTimeout);
    }

    /**
     * Compute the SHA-256 fingerprint of the server host key WITHOUT authenticating.
     * phpseclib establishes the transport (and thus learns the host key) before login().
     *
     * @return string e.g. "SHA256:Base64==" — safe to store / display (non-sensitive).
     */
    public function getHostKeyFingerprint(): string
    {
        $hostKey = $this->ssh->getServerPublicHostKey();
        if ($hostKey === false || $hostKey === null || $hostKey === '') {
            throw new RuntimeException('Unable to read remote host key');
        }

        // getServerPublicHostKey() returns "ssh-rsa <base64> [comment]"; hash the raw key blob.
        $parts = explode(' ', trim((string) $hostKey));
        $blob = isset($parts[1]) ? base64_decode($parts[1], true) : false;
        if ($blob === false) {
            // Fallback: hash the whole string (still stable for TOFU comparison).
            $blob = (string) $hostKey;
        }

        return 'SHA256:' . rtrim(base64_encode(hash('sha256', $blob, true)), '=');
    }

    /**
     * Enforce trust-on-first-use against a previously recorded fingerprint.
     * Returns the current fingerprint so the caller can persist it on first connect.
     *
     * @throws RuntimeException when a stored fingerprint does not match (possible MITM / host change).
     */
    public function verifyOrPinHostKey(?string $knownFingerprint): string
    {
        $current = $this->getHostKeyFingerprint();

        if ($knownFingerprint !== null && $knownFingerprint !== '' && !hash_equals($knownFingerprint, $current)) {
            throw new RuntimeException(
                'Host key mismatch: stored fingerprint does not match the server. Aborting to prevent man-in-the-middle.'
            );
        }

        return $current;
    }

    /**
     * Authenticate with a password.
     *
     * @throws RuntimeException on auth failure.
     */
    public function loginWithPassword(string $user, string $password): void
    {
        if (!$this->ssh->login($user, $password)) {
            throw new RuntimeException('SSH authentication failed (password)');
        }
    }

    /**
     * Authenticate with a private key (PEM/OpenSSH), optional passphrase.
     *
     * @throws RuntimeException on key parse or auth failure.
     */
    public function loginWithKey(string $user, string $privateKeyContents, ?string $passphrase = null): void
    {
        try {
            /** @var AsymmetricKey $key */
            $key = ($passphrase !== null && $passphrase !== '')
                ? PublicKeyLoader::load($privateKeyContents, $passphrase)
                : PublicKeyLoader::load($privateKeyContents);
        } catch (\Throwable $e) {
            // Do not leak key material in the message.
            throw new RuntimeException('Failed to load private key (bad key or wrong passphrase)');
        }

        if (!$this->ssh->login($user, $key)) {
            throw new RuntimeException('SSH authentication failed (key)');
        }
    }

    /**
     * Run a command, returning [stdout, exitCode]. Output is NOT redacted here — call
     * redact() before persisting. The command itself may contain a token, so callers
     * must never persist the raw command.
     *
     * @return array{0:string,1:int|false}
     */
    public function runCommand(string $command, int $timeout = self::DEFAULT_COMMAND_TIMEOUT): array
    {
        $this->ssh->setTimeout($timeout);
        $output = $this->ssh->exec($command);
        $exit = $this->ssh->getExitStatus();

        return [is_string($output) ? $output : '', $exit];
    }

    /**
     * Feed a script to the remote shell over stdin and run it with the given interpreter
     * invocation (e.g. "sudo bash -s -- --mode machine ..."). The script body never appears
     * on the remote process list; only the wrapper invocation (which may carry a token) does.
     *
     * phpseclib's exec() runs a single remote command; to pipe a script body to stdin we
     * base64-encode it and decode on the remote side. This avoids quoting/heredoc pitfalls
     * and keeps the (large) script off the argv.
     *
     * @return array{0:string,1:int|false}
     */
    public function runScript(string $scriptBody, string $invocation, int $timeout = self::DEFAULT_COMMAND_TIMEOUT): array
    {
        $encoded = base64_encode($scriptBody);

        // Replace ONLY the first "__SCRIPT__" occurrence — that is the real placeholder (it
        // precedes the argument list by construction). A blanket str_replace would also rewrite
        // the literal inside already-escaped argument values (e.g. a panel URL containing it),
        // silently corrupting them.
        $pos = strpos($invocation, '__SCRIPT__');
        if ($pos !== false) {
            $invocation = substr_replace($invocation, '"$__XB_TMP"', $pos, strlen('__SCRIPT__'));
        }

        // Decode the script to a temp file, execute with the requested invocation, then remove it.
        // The token (inside $invocation) is the only sensitive token on argv; the script body is not.
        $remote = sprintf(
            'set -e; __XB_TMP="$(mktemp)"; printf %%s %s | base64 -d > "$__XB_TMP"; trap "rm -f \"$__XB_TMP\"" EXIT; %s',
            escapeshellarg($encoded),
            $invocation
        );

        return $this->runCommand($remote, $timeout);
    }

    /**
     * Close and burn the connection.
     */
    public function disconnect(): void
    {
        if ($this->ssh !== null) {
            try {
                $this->ssh->disconnect();
            } catch (\Throwable $e) {
                // ignore
            }
            $this->ssh = null;
        }
    }

    public function __destruct()
    {
        $this->disconnect();
    }

    /**
     * Redact sensitive material from text destined for the provisioning log / error / response.
     *
     * Strips: --token <value>, password= / token= assignments, PEM private-key blocks,
     * and any caller-supplied secret literals.
     *
     * @param string $text
     * @param string[] $extraSecrets exact secret strings to mask (e.g. machine token, password)
     */
    public static function redact(string $text, array $extraSecrets = []): string
    {
        if ($text === '') {
            return $text;
        }

        // Mask explicit secrets first (longest first to avoid partial leaks).
        $secrets = array_filter(array_unique($extraSecrets), fn($s) => is_string($s) && strlen($s) >= 4);
        usort($secrets, fn($a, $b) => strlen($b) <=> strlen($a));
        foreach ($secrets as $secret) {
            $text = str_replace($secret, '***', $text);
        }

        // Mask common credential-bearing CLI flags / assignments.
        $patterns = [
            '/(--token[=\s]+)\S+/i' => '$1***',
            '/(--password[=\s]+)\S+/i' => '$1***',
            '/((?:password|passwd|pwd|token|secret|api[_-]?key)\s*[:=]\s*)\S+/i' => '$1***',
            '/(Authorization:\s*Bearer\s+)\S+/i' => '$1***',
        ];
        foreach ($patterns as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text) ?? $text;
        }

        // Strip any PEM private key blocks entirely.
        $text = preg_replace(
            '/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----/s',
            '[REDACTED PRIVATE KEY]',
            $text
        ) ?? $text;

        return $text;
    }
}
