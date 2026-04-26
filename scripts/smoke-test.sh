#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Generative City Wallet — End-to-End Smoke Test
# Verifies the full journey: auth → context → offer → accept → validate → redeem
# Usage: bash scripts/smoke-test.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Generative City Wallet — Smoke Test"
echo "═══════════════════════════════════════════════════"
echo ""

# ── 1. Health checks ──────────────────────────────────────────────────────────
info "Checking service health..."

for port in 3000 3001 3002 3003 3004; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/health" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    pass "Service on port ${port} is healthy"
  else
    fail "Service on port ${port} returned HTTP ${STATUS} — is 'docker compose up -d' running?"
  fi
done

# ── 2. Auth — login ───────────────────────────────────────────────────────────
info "Testing authentication..."

LOGIN_RESP=$(curl -s -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer@demo.com","password":"demo1234"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo "")
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('refresh_token',''))" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  fail "Login failed — no access token returned. Response: $LOGIN_RESP"
fi
pass "Login successful — got access token"

# ── 3. Auth — /me ─────────────────────────────────────────────────────────────
ME_RESP=$(curl -s "${BASE}/auth/me" -H "Authorization: Bearer ${ACCESS_TOKEN}")
USER_EMAIL=$(echo "$ME_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('email',''))" 2>/dev/null || echo "")
if [ "$USER_EMAIL" = "consumer@demo.com" ]; then
  pass "/auth/me returns correct user"
else
  fail "/auth/me failed. Response: $ME_RESP"
fi

# ── 4. Auth — token refresh ───────────────────────────────────────────────────
REFRESH_RESP=$(curl -s -X POST "${BASE}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"${REFRESH_TOKEN}\"}")
NEW_TOKEN=$(echo "$REFRESH_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$NEW_TOKEN" ]; then
  pass "Token refresh works"
  ACCESS_TOKEN="$NEW_TOKEN"
else
  fail "Token refresh failed. Response: $REFRESH_RESP"
fi

# ── 5. Context — demo mode ────────────────────────────────────────────────────
info "Testing context aggregation (demo mode)..."

CONTEXT_RESP=$(curl -s -X POST "${BASE}/api/v1/context/demo" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

RELEVANCE=$(echo "$CONTEXT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('relevance_score',0))" 2>/dev/null || echo "0")
if [ "$RELEVANCE" -ge 80 ] 2>/dev/null; then
  pass "Demo context returned relevance score: ${RELEVANCE}"
else
  fail "Demo context failed or low relevance. Response: $CONTEXT_RESP"
fi

# ── 6. Offer generation ───────────────────────────────────────────────────────
info "Testing offer generation..."

CONTEXT_DATA=$(echo "$CONTEXT_RESP" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('data',{})))" 2>/dev/null || echo "{}")
CONSUMER_ID="smoke-test-consumer-$(date +%s)"

OFFER_RESP=$(curl -s -X POST "${BASE}/api/v1/offers/generate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"context_state\":${CONTEXT_DATA},\"consumer_id\":\"${CONSUMER_ID}\",\"consumer_language\":\"de\"}")

OFFER_COUNT=$(echo "$OFFER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null || echo "0")
if [ "$OFFER_COUNT" -ge 1 ] 2>/dev/null; then
  pass "Generated ${OFFER_COUNT} offer(s)"
else
  fail "Offer generation returned 0 offers. Response: $OFFER_RESP"
fi

OFFER_ID=$(echo "$OFFER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null || echo "")
MERCHANT_ID=$(echo "$OFFER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['merchant_id'])" 2>/dev/null || echo "")
DISCOUNT=$(echo "$OFFER_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['discount_percentage'])" 2>/dev/null || echo "0")
pass "Offer ID: ${OFFER_ID:0:8}… | Merchant: ${MERCHANT_ID:0:8}… | Discount: ${DISCOUNT}%"

# ── 7. Offer acceptance → token ───────────────────────────────────────────────
info "Testing offer acceptance..."

ACCEPT_RESP=$(curl -s -X POST "${BASE}/api/v1/checkout/accept" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"offer_id\":\"${OFFER_ID}\",\"consumer_id\":\"${CONSUMER_ID}\"}")

TOKEN=$(echo "$ACCEPT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ] && [ ${#TOKEN} -eq 32 ]; then
  pass "Offer accepted — token generated (${#TOKEN} chars, 128-bit)"
else
  fail "Offer acceptance failed. Response: $ACCEPT_RESP"
fi

# ── 8. Token validation ───────────────────────────────────────────────────────
info "Testing token validation..."

VALIDATE_RESP=$(curl -s -X POST "${BASE}/api/v1/validate/token" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\",\"merchant_id\":\"${MERCHANT_ID}\"}")

IS_VALID=$(echo "$VALIDATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('is_valid',''))" 2>/dev/null || echo "")
if [ "$IS_VALID" = "True" ] || [ "$IS_VALID" = "true" ]; then
  pass "Token validated successfully"
else
  fail "Token validation failed. Response: $VALIDATE_RESP"
fi

# ── 9. Simulated checkout ─────────────────────────────────────────────────────
info "Testing simulated checkout..."

CHECKOUT_RESP=$(curl -s -X POST "${BASE}/api/v1/checkout/complete" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\",\"original_price\":12.50}")

FINAL_PRICE=$(echo "$CHECKOUT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('final_price',''))" 2>/dev/null || echo "")
if [ -n "$FINAL_PRICE" ]; then
  DISCOUNT_AMT=$(echo "$CHECKOUT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('discount_amount',''))" 2>/dev/null || echo "0")
  pass "Checkout complete — Original: €12.50 | Discount: €${DISCOUNT_AMT} | Final: €${FINAL_PRICE}"
else
  fail "Checkout failed. Response: $CHECKOUT_RESP"
fi

# ── 10. Duplicate redemption rejected ────────────────────────────────────────
info "Testing duplicate redemption prevention..."

DUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/v1/checkout/complete" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\",\"original_price\":12.50}")

if [ "$DUP_STATUS" = "409" ]; then
  pass "Duplicate redemption correctly rejected (HTTP 409)"
else
  fail "Expected HTTP 409 for duplicate redemption, got ${DUP_STATUS}"
fi

# ── 11. Merchant performance ──────────────────────────────────────────────────
info "Testing merchant performance endpoint..."

PERF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${BASE}/api/v1/merchants/${MERCHANT_ID}/performance" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

if [ "$PERF_STATUS" = "200" ]; then
  pass "Merchant performance endpoint works"
else
  fail "Merchant performance returned HTTP ${PERF_STATUS}"
fi

# ── 12. Logout ────────────────────────────────────────────────────────────────
info "Testing logout..."

LOGOUT_RESP=$(curl -s -X POST "${BASE}/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"${REFRESH_TOKEN}\"}")

LOGOUT_OK=$(echo "$LOGOUT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null || echo "")
if [ "$LOGOUT_OK" = "True" ] || [ "$LOGOUT_OK" = "true" ]; then
  pass "Logout successful"
else
  fail "Logout failed. Response: $LOGOUT_RESP"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ All smoke tests passed!${NC}"
echo "  Full journey verified:"
echo "  Auth → Context → Offer → Accept → Validate → Redeem"
echo "═══════════════════════════════════════════════════"
echo ""
