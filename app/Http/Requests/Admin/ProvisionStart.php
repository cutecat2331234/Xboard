<?php

namespace App\Http\Requests\Admin;

/**
 * Validation for "start SSH auto-provisioning".
 *
 * Reuses ServerSave's protocol rule set for the node parameters (nested under `node_params.*`)
 * so node validation stays in lock-step with the manual "add node" form, and adds SSH connection
 * rules on top. SSH secrets are validated but MUST NOT be logged or persisted by the controller.
 */
class ProvisionStart extends ServerSave
{
    public function rules(): array
    {
        // --- Node parameters: reuse ServerSave base + protocol rules, prefixed under node_params. ---
        $type = (string) $this->input('node_params.type');
        $baseRules = $this->getBaseRules();
        $protocolRules = $this->getProtocolRules($type);
        foreach ($protocolRules as $field => $rule) {
            $baseRules['protocol_settings.' . $field] = $rule;
        }

        $rules = [];
        foreach ($baseRules as $field => $rule) {
            $rules['node_params.' . $field] = $rule;
        }

        // node_params.kernel is provisioning-specific (passed to install.sh), not a Server column.
        $rules['node_params'] = 'required|array';
        $rules['node_params.kernel'] = 'nullable|string|in:singbox,xray';
        // machine_id may select an existing machine to attach the node to.
        $rules['node_params.machine_id'] = 'nullable|integer|exists:v2_server_machine,id';

        // --- SSH connection (credentials validated, never persisted) ---
        $rules['host'] = 'required|string|max:255';
        $rules['port'] = 'nullable|integer|min:1|max:65535';
        $rules['ssh_user'] = 'nullable|string|max:255';
        $rules['auth_method'] = 'required|in:password,key';
        $rules['password'] = 'required_if:auth_method,password|nullable|string';
        $rules['private_key'] = 'required_if:auth_method,key|nullable|string';
        $rules['passphrase'] = 'nullable|string';

        return $rules;
    }

    public function attributes(): array
    {
        // Re-map ServerSave's attribute labels under node_params.* so messages read correctly.
        $attrs = [];
        foreach (parent::attributes() as $field => $label) {
            $attrs['node_params.' . $field] = $label;
        }
        return $attrs;
    }

    public function messages(): array
    {
        // Re-key ServerSave's messages where they reference concrete fields; generic wildcard
        // messages are re-prefixed so they continue to fire under node_params.*.
        $messages = [];
        foreach (parent::messages() as $key => $value) {
            if (str_starts_with($key, 'protocol_settings.')) {
                $messages['node_params.' . $key] = $value;
            } else {
                // e.g. "type.required" -> "node_params.type.required"
                $messages['node_params.' . $key] = $value;
            }
        }

        $messages['host.required'] = __('Node host cannot be empty');
        $messages['auth_method.required'] = __('Please select an authentication method');
        $messages['auth_method.in'] = __('Invalid authentication method');
        $messages['password.required_if'] = __('Password is required');
        $messages['private_key.required_if'] = __('Private key is required');

        return $messages;
    }
}
