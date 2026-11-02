# Turnstile monitoring — deployed and verified

**Owner cost approval:** Received October 28, 2026 for the proposed ~$1.20/month metric/alarm cost before allowances/credits and excluding other AWS usage. Do not ask for the same approval again. **Deployment:** Completed October 28, 2026 after the owner granted the required permissions. AWS readback confirms all three filters and alarms match the reviewed plan.

Completed audit task: alert on missing or failed production Turnstile verification. The application returns controlled HTTP errors for these cases, so the existing Lambda `Errors` alarm does not cover them.

## Deployed resources

All resources use `us-east-1`, the existing `/aws/lambda/red-remodels-contact-handler` Standard log group, and the existing `redremodels-alerts` SNS topic. No application changes, new subscriptions, raw customer logs, log ingestion, or contact submissions are needed.

| Alarm suffix | What it detects | Threshold |
| --- | --- | --- |
| `configuration` | Missing/invalid server configuration or provider rejection of the secret | At least 1 event in 5 minutes |
| `unavailable` | Provider/network failures, HTTP errors, or provider internal errors | At least 1 event in 5 minutes |
| `rejections` | Other rejected tokens, including expired/replayed tokens and hostname/action mismatches | At least 10 events in each of 2 consecutive 5-minute periods |

Full names start with `redremodels-turnstile-`. Thresholds are initial operational settings to review with actual traffic. An isolated invalid token does not trigger the rejection-volume alarm. Domain/action mistakes with otherwise successful provider responses fall into the rejection-volume category rather than the immediate configuration alarm. Missing request tokens are rejected before the provider call and do not create provider-rejection metrics.

These are three dimension-free custom metrics in `RedRemodels/Contact` and three standard-resolution alarms. Dimensions are intentionally absent: no per-IP, request-ID, token, hostname, email, or customer metric series are created. Missing data is treated as not breaching. Existing logging must remain free of tokens, secrets, and contact fields.

## Cost approval

Estimated metric/alarm cost is **about $1.20/month before available free allowances or credits**: 3 × $0.30 custom metrics plus 3 × $0.10 standard alarms. Existing logs, API calls, SNS delivery, taxes, and other AWS usage are separate. This is not an overall AWS spending cap. The three metric filters and three alarms are now deployed.

Rates checked October 28, 2026 against [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/). Free allowances are account-wide; availability has not been verified, so do not promise these resources will be free. The owner has approved this monitoring cost; AWS pattern validation and deployment readback both passed.

## Verification and deployment record

Read-only checks on October 28, 2026 confirmed:

- Existing CloudFront 4xx, CloudFront 5xx, and Lambda Errors alarms are all `OK`.
- The Lambda log group is Standard class with 90-day retention.
- The existing SNS alert topic has one confirmed email subscription.
- Initial CLI access was denied. After the owner completed the administrator permissions step, filter inspection/testing and resource creation succeeded. No IAM policy was attached by the coding agent.
- All three filters and alarms were created and independently read back against the reviewed JSON. Private before/after snapshots and receipts: `.local/waf-baselines/turnstile-monitoring-adh5jk0s/`.
- No contact requests, synthetic log ingestion, fake metric data, or test notifications were sent. End-to-end notification delivery remains untested.

Nine offline safety checks passed for wrong-account rejection, conflicting owner filters/alarms, unconfirmed subscribers, permission failure, unexpected metric dimensions, and normalized AWS readback/private backups. The added validation regression checks cover AWS’s one-based event numbers and unexpected matches. Real AWS pattern validation now passes for all three filters: the earlier reported configuration failure was a validator indexing error, not an incorrect filter match. Validation itself created no resources.

## Administrator permission setup (completed for this deployment)

An authorized IAM administrator should review [deployer-permissions.json](./deployer-permissions.json) and attach the approved supplement to IAM user `red-remodels-deployer` in account `365608889294`.

Console path: **IAM → Users → red-remodels-deployer → Permissions → Add permissions → Create inline policy → JSON**. Paste the reviewed file, name it `RedRemodelsTurnstileMonitoring`, and create the policy. Do not replace existing policies or use root credentials in this project.

The supplement scopes metric-filter changes to this Lambda log group and alarm changes to the Turnstile alarm prefix. Pattern testing requires `Resource: "*"` because that API has no resource to scope; it is restricted to `us-east-1`. The supplement grants no IAM-administration permissions and does not override SCPs, permissions boundaries, or explicit denies. It is a supplement, not proof that the deployer's existing permissions are least privilege.

For an administrator who prefers the terminal, from the project root use their **own configured administrator profile** (replace the placeholder):

```bash
aws iam put-user-policy \
  --user-name red-remodels-deployer \
  --policy-name RedRemodelsTurnstileMonitoring \
  --policy-document file://infra/turnstile-monitoring/deployer-permissions.json \
  --profile YOUR_ADMIN_PROFILE
```

Do not send administrator credentials to the coding agent. Report only that the permissions were granted, or provide the name of a newly authenticated administrator CLI profile so the coding agent can attach the policy. Do not provide credentials. The monitoring cost is already approved.

## Validation and deployment sequence

From the repository root:

```bash
# Safe local summary; no AWS calls or changes.
python3 scripts/configure-turnstile-monitoring.py plan

# Uses only AWS TestMetricFilter and synthetic non-personal messages.
# Creates no metrics, logs, alarms, or notifications.
python3 scripts/configure-turnstile-monitoring.py validate

# Only after permissions and owner cost approval.
python3 scripts/configure-turnstile-monitoring.py apply

# Read-only status for the three deployed alarms.
python3 scripts/configure-turnstile-monitoring.py status
```

The deployer first checks account identity, validates patterns with AWS, checks log class/subscriber confirmation, and inspects existing resources. It refuses to replace differing same-name filters/alarms. It creates only missing resources, backs up configuration privately under `.local/waf-baselines/turnstile-monitoring-*/`, and verifies readback. It does not modify the application, log retention, existing three alarms, IAM, SNS subscriptions, or public forms.

If deployment stops after partial creation, inspect saved state before rerunning. Matching resources are skipped; mismatching resources require review. No test notification, synthetic log event, or fake metric datapoint is sent by this script. An end-to-end notification delivery test requires separate owner authorization; a confirmed subscription alone does not prove delivery.

## Limitations and rollback

Filters apply to newly ingested events, not historical logs. Default zero values are produced only when logs are ingested; idle periods remain missing/not breaching. Initial alarms can be `INSUFFICIENT_DATA`. Counts may include duplicate log deliveries. See [CloudWatch metric-filter behavior](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html).

These alarms monitor server verification. A browser-blocked SDK that never reaches Lambda is not visible here. Client-side telemetry or a synthetic browser monitor would be a separate privacy/cost decision; the existing browser status/phone fallback and safe local diagnostic codes remain useful.

For rollback, an authorized operator can remove only these three named metric filters and three Turnstile alarms after checking them against the saved plan. Preserve other alarms, logs, the origin guard, Turnstile validation, and SNS subscribers. Stop the filters before expecting metric publishing charges to cease; historical metrics can remain visible. No rollback is performed automatically.

Sources: [filter syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html), [Logs action/resource scopes](https://docs.aws.amazon.com/service-authorization/latest/reference/list_logs.html), [CloudWatch action/resource scopes](https://docs.aws.amazon.com/service-authorization/latest/reference/list_cloudwatch.html).
