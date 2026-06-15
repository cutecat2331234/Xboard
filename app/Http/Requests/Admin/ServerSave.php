<?php


namespace App\Http\Requests\Admin;

use App\Models\Server;
use Illuminate\Foundation\Http\FormRequest;

class ServerSave extends FormRequest
{
    private const UTLS_RULES = [
        'utls.enabled' => 'nullable|boolean',
        'utls.fingerprint' => 'nullable|string',
    ];

    private const MULTIPLEX_RULES = [
        'multiplex.enabled' => 'nullable|boolean',
        'multiplex.protocol' => 'nullable|string',
        'multiplex.max_connections' => 'nullable|integer',
        'multiplex.min_streams' => 'nullable|integer',
        'multiplex.max_streams' => 'nullable|integer',
        'multiplex.padding' => 'nullable|boolean',
        'multiplex.brutal.enabled' => 'nullable|boolean',
        'multiplex.brutal.up_mbps' => 'nullable|integer',
        'multiplex.brutal.down_mbps' => 'nullable|integer',
    ];

    private const ECH_RULES = [
        'enabled' => 'nullable|boolean',
        'config' => 'nullable|string',
        'query_server_name' => 'nullable|string',
        'key' => 'nullable|string',
    ];

    private const REALITY_RULES = [
        'reality_settings.allow_insecure' => 'nullable|boolean',
        'reality_settings.server_name' => 'nullable|string',
        'reality_settings.server_port' => 'nullable|integer',
        'reality_settings.public_key' => 'nullable|string',
        'reality_settings.private_key' => 'nullable|string',
        'reality_settings.short_id' => 'nullable|string',
    ];

    private const PROTOCOL_RULES = [
        'shadowsocks' => [
            'cipher' => 'required|string',
            'obfs' => 'nullable|string',
            'obfs_settings.path' => 'nullable|string',
            'obfs_settings.host' => 'nullable|string',
            'plugin' => 'nullable|string',
            'plugin_opts' => 'nullable|string',
        ],
        'vmess' => [
            'tls' => 'required|integer',
            'network' => 'required|string',
            'network_settings' => 'nullable|array',
            'rules' => 'nullable|array',
        ],
        'trojan' => [
            'tls' => 'nullable|integer',
            'network' => 'required|string',
            'network_settings' => 'nullable|array',
            'server_name' => 'nullable|string',
            'allow_insecure' => 'nullable|boolean',
        ],
        'hysteria' => [
            'version' => 'required|integer',
            'alpn' => 'nullable|string',
            'obfs.open' => 'nullable|boolean',
            'obfs.type' => 'string|nullable',
            'obfs.password' => 'string|nullable',
            'bandwidth.up' => 'nullable|integer',
            'bandwidth.down' => 'nullable|integer',
            'hop_interval' => 'integer|nullable',
        ],
        'vless' => [
            'tls' => 'required|integer',
            'network' => 'required|string',
            'network_settings' => 'nullable|array',
            'flow' => 'nullable|string',
            'encryption' => 'nullable|array',
            'encryption.enabled' => 'nullable|boolean',
            'encryption.encryption' => 'nullable|string',
            'encryption.decryption' => 'nullable|string',
        ],
        'socks' => [
            'tls' => 'nullable|integer',
        ],
        'naive' => [
            'tls' => 'required|integer',
        ],
        'http' => [
            'tls' => 'required|integer',
        ],
        'tuic' => [
            'version' => 'nullable|integer',
            'congestion_control' => 'nullable|string',
            'alpn' => 'nullable|array',
            'udp_relay_mode' => 'nullable|string',
        ],
        'mieru' => [
            'transport' => 'required|string|in:TCP,UDP',
            'traffic_pattern' => 'string',
        ],
        'anytls' => [
            'tls' => 'nullable|array',
            'alpn' => 'nullable|string',
            'padding_scheme' => 'nullable|array',
        ],
    ];

    private function getBaseRules(): array
    {
        return [
            'type' => 'required|in:' . implode(',', Server::VALID_TYPES),
            'spectific_key' => 'nullable|string',
            'code' => 'nullable|string',
            'show' => '',
            'name' => 'required|string',
            'group_ids' => 'nullable|array',
            'route_ids' => 'nullable|array',
            'parent_id' => 'nullable|integer',
            'machine_id' => 'nullable|integer',
            'enabled' => 'nullable|boolean',
            'host' => 'required',
            'port' => 'required',
            'server_port' => 'required',
            'tags' => 'nullable|array',
            'excludes' => 'nullable|array',
            'ips' => 'nullable|array',
            'rate' => 'required|numeric',
            'rate_time_enable' => 'nullable|boolean',
            'rate_time_ranges' => 'nullable|array',
            'custom_outbounds' => 'nullable|array',
            'custom_routes' => 'nullable|array',
            'cert_config' => 'nullable|array',
            'rate_time_ranges.*.start' => 'required_with:rate_time_ranges|string|date_format:H:i',
            'rate_time_ranges.*.end' => 'required_with:rate_time_ranges|string|date_format:H:i',
            'rate_time_ranges.*.rate' => 'required_with:rate_time_ranges|numeric|min:0',
            'protocol_settings' => 'array',
            'transfer_enable' => 'nullable|integer|min:0',
        ];
    }

    private function getProtocolRules(string $type): array
    {
        $rules = self::PROTOCOL_RULES[$type] ?? [];

        return match ($type) {
            'vmess' => array_merge(
                $rules,
                $this->buildTlsSettingsRules(),
                self::MULTIPLEX_RULES,
                self::UTLS_RULES,
            ),
            'trojan' => array_merge(
                $rules,
                $this->buildTlsSettingsRules(includeRoot: true),
                self::REALITY_RULES,
                self::MULTIPLEX_RULES,
                self::UTLS_RULES,
            ),
            'hysteria' => array_merge(
                $rules,
                $this->buildTlsObjectRules(),
            ),
            'tuic' => array_merge(
                $rules,
                $this->buildTlsObjectRules(),
            ),
            'mieru' => array_merge(
                $rules,
                self::MULTIPLEX_RULES,
            ),
            'vless' => array_merge(
                $rules,
                $this->buildTlsSettingsRules(),
                self::REALITY_RULES,
                self::MULTIPLEX_RULES,
                self::UTLS_RULES,
            ),
            'socks', 'naive', 'http' => array_merge(
                $rules,
                $this->buildTlsSettingsRules(includeRoot: $type !== 'socks'),
            ),
            'anytls' => array_merge(
                $rules,
                $this->buildTlsObjectRules(includeRoot: true),
            ),
            default => $rules,
        };
    }

    private function buildTlsSettingsRules(bool $includeRoot = false): array
    {
        return array_merge(
            $includeRoot ? ['tls_settings' => 'nullable|array'] : [],
            [
                'tls_settings.server_name' => 'nullable|string',
                'tls_settings.allow_insecure' => 'nullable|boolean',
                'tls_settings.ech' => 'nullable|array',
            ],
            $this->prefixRules('tls_settings.ech.', self::ECH_RULES),
        );
    }

    private function buildTlsObjectRules(bool $includeRoot = false): array
    {
        return array_merge(
            $includeRoot ? ['tls' => 'nullable|array'] : [],
            [
                'tls.server_name' => 'nullable|string',
                'tls.allow_insecure' => 'nullable|boolean',
                'tls.ech' => 'nullable|array',
            ],
            $this->prefixRules('tls.ech.', self::ECH_RULES),
        );
    }

    private function prefixRules(string $prefix, array $rules): array
    {
        $result = [];
        foreach ($rules as $field => $rule) {
            $result[$prefix . $field] = $rule;
        }
        return $result;
    }

    public function rules(): array
    {
        $type = $this->input('type');
        $rules = $this->getBaseRules();
        $protocolRules = $this->getProtocolRules($type);

        foreach ($protocolRules as $field => $rule) {
            $rules['protocol_settings.' . $field] = $rule;
        }

        return $rules;
    }

    public function attributes(): array
    {
        return [
            'protocol_settings.cipher' => __('Cipher method'),
            'protocol_settings.obfs' => __('Obfuscation type'),
            'protocol_settings.network' => __('Transport protocol'),
            'protocol_settings.port_range' => __('Port range'),
            'protocol_settings.traffic_pattern' => __('Traffic pattern'),
            'protocol_settings.transport' => __('Transport mode'),
            'protocol_settings.version' => __('Protocol version'),
            'protocol_settings.password' => __('Password'),
            'protocol_settings.handshake.server' => __('Handshake server'),
            'protocol_settings.handshake.server_port' => __('Handshake port'),
            'protocol_settings.multiplex.enabled' => __('Multiplex'),
            'protocol_settings.multiplex.protocol' => __('Multiplex protocol'),
            'protocol_settings.multiplex.max_connections' => __('Max connections'),
            'protocol_settings.multiplex.min_streams' => __('Min streams'),
            'protocol_settings.multiplex.max_streams' => __('Max streams'),
            'protocol_settings.multiplex.padding' => __('Multiplex padding'),
            'protocol_settings.multiplex.brutal.enabled' => __('Brutal acceleration'),
            'protocol_settings.multiplex.brutal.up_mbps' => __('Brutal upload rate'),
            'protocol_settings.multiplex.brutal.down_mbps' => __('Brutal download rate'),
            'protocol_settings.utls.enabled' => __('uTLS'),
            'protocol_settings.utls.fingerprint' => __('uTLS fingerprint'),
            'protocol_settings.tls_settings.ech.enabled' => __('ECH'),
            'protocol_settings.tls_settings.ech.config' => __('ECH config'),
            'protocol_settings.tls_settings.ech.query_server_name' => __('ECH query domain'),
            'protocol_settings.tls_settings.ech.key' => __('ECH key'),
            'protocol_settings.tls.ech.enabled' => __('ECH'),
            'protocol_settings.tls.ech.config' => __('ECH config'),
            'protocol_settings.tls.ech.query_server_name' => __('ECH query domain'),
            'protocol_settings.tls.ech.key' => __('ECH key'),
        ];
    }

    public function messages()
    {
        return [
            'name.required' => __('Node name cannot be empty'),
            'group_ids.required' => __('Permission group cannot be empty'),
            'group_ids.array' => __('Permission group format is invalid'),
            'route_ids.array' => __('Route group format is invalid'),
            'parent_id.integer' => __('Parent ID format is invalid'),
            'host.required' => __('Node host cannot be empty'),
            'port.required' => __('Connection port cannot be empty'),
            'server_port.required' => __('Backend port cannot be empty'),
            'tls.required' => __('TLS cannot be empty'),
            'tags.array' => __('Tags format is invalid'),
            'rate.required' => __('Rate cannot be empty'),
            'rate.numeric' => __('Rate format is invalid'),
            'network.required' => __('Transport protocol cannot be empty'),
            'network.in' => __('Transport protocol format is invalid'),
            'networkSettings.array' => __('Transport settings format is invalid'),
            'ruleSettings.array' => __('Rule settings format is invalid'),
            'tlsSettings.array' => __('TLS settings format is invalid'),
            'dnsSettings.array' => __('DNS settings format is invalid'),
            'protocol_settings.*.required' => __('The :attribute field is required'),
            'protocol_settings.*.required_if' => __('The :attribute field is required'),
            'protocol_settings.*.string' => __('The :attribute field must be a string'),
            'protocol_settings.*.integer' => __('The :attribute field must be an integer'),
            'protocol_settings.*.in' => __('The :attribute field has an invalid value'),
            'transfer_enable.integer' => __('Traffic limit must be an integer'),
            'transfer_enable.min' => __('Traffic limit cannot be less than 0'),
        ];
    }
}
