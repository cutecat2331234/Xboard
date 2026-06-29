<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Internal control-flow signal for ProvisionNodeJob: a state-machine step has already recorded
 * its own failure/timeout onto the v2_server_provisioning row, so the job's handle() loop should
 * stop quietly without double-recording an error.
 */
class ProvisioningHaltException extends RuntimeException
{
}
