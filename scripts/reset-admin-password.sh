#!/bin/bash
set -euo pipefail
EMAIL="${1:-admin@example.com}"
PASS="${2:-your-password}"
cd /opt/xboard
php8.5 artisan tinker --execute="
\$u = App\Models\User::where('email', '${EMAIL}')->first();
if (!\$u) { echo 'NO_USER'; exit(1); }
\$u->password = password_hash('${PASS}', PASSWORD_DEFAULT);
\$u->save();
echo 'RESET_OK:' . \$u->email;
"
