#!/usr/bin/env bash
# Run this once CloudWatch permissions are added to red-remodels-deployer
# Requires: cloudwatch:PutMetricAlarm, lambda:PutFunctionEventInvokeConfig

set -euo pipefail

PROFILE="red-remodels-deployer"
SNS_ARN="arn:aws:sns:us-east-1:365608889294:redremodels-alerts"
CF_ID="EKTYEDHVURFWC"
LAMBDA_NAME="red-remodels-contact-handler"

echo "Creating CloudFront 5xx alarm..."
aws cloudwatch put-metric-alarm \
  --alarm-name "redremodels-cloudfront-5xx" \
  --alarm-description "CloudFront 5xx error rate exceeded 2%" \
  --namespace AWS/CloudFront \
  --metric-name 5xxErrorRate \
  --dimensions Name=DistributionId,Value=$CF_ID Name=Region,Value=Global \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 2 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_ARN \
  --ok-actions $SNS_ARN \
  --treat-missing-data notBreaching \
  --region us-east-1 \
  --profile $PROFILE

echo "Creating CloudFront 4xx alarm..."
aws cloudwatch put-metric-alarm \
  --alarm-name "redremodels-cloudfront-4xx" \
  --alarm-description "CloudFront 4xx error rate exceeded 10%" \
  --namespace AWS/CloudFront \
  --metric-name 4xxErrorRate \
  --dimensions Name=DistributionId,Value=$CF_ID Name=Region,Value=Global \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $SNS_ARN \
  --treat-missing-data notBreaching \
  --region us-east-1 \
  --profile $PROFILE

echo "Creating Lambda error alarm..."
aws cloudwatch put-metric-alarm \
  --alarm-name "redremodels-lambda-errors" \
  --alarm-description "Lambda contact handler errors in last 5 minutes" \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$LAMBDA_NAME \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions $SNS_ARN \
  --treat-missing-data notBreaching \
  --region us-east-1 \
  --profile $PROFILE

echo "All alarms created successfully."
echo ""
echo "NOTE: Confirm the SNS subscription by clicking the link in the"
echo "email sent to hector@savio.design"
