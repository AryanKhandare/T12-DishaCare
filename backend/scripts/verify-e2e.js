const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const assert = require('assert');

(async () => {
  console.log('--- STARTING COMPREHENSIVE END-TO-END VERIFICATION ---');

  // Step 1: Query active hospitals from backend
  const hospRes = await fetch('http://localhost:5000/api/hospitals');
  const hospitals = await hospRes.json();
  console.log('✓ 1. Loaded active hospitals:', hospitals.length);
  assert(hospitals.length > 0);
  const selectedHosp = hospitals.find(h => h.id === 'h-city') || hospitals[0];
  console.log('✓ Selected Hospital for Nurse:', selectedHosp.name, '(' + selectedHosp.id + ')');

  // Step 2: Request SMS OTP
  const phone = '+9197' + Date.now().toString().slice(-8);
  const sendOtpRes = await fetch('http://localhost:5000/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  assert.strictEqual(sendOtpRes.status, 200, 'send-otp status was not 200');
  const sendOtpData = await sendOtpRes.json();
  console.log('✓ 2. SMS OTP requested:', sendOtpData.message);
  const otpCode = sendOtpData.devOtp;
  assert(otpCode, 'Dev OTP was not provided in dev mode');
  console.log('✓ OTP received via SMS Service abstraction:', otpCode);

  // Step 3: Verify OTP is hashed in PostgreSQL (NOT plaintext)
  const otpInDb = await prisma.otpVerification.findFirst({
    where: { phone },
    orderBy: { createdAt: 'desc' }
  });
  assert(otpInDb, 'OTP record not found in PostgreSQL');
  assert(otpInDb.otpHash.startsWith('$2'), 'OTP is not bcrypt hashed!');
  assert(otpInDb.otpHash !== otpCode, 'Raw OTP leaked in database!');
  console.log('✓ 3. Verified in PostgreSQL: OTP is securely hashed with bcrypt:', otpInDb.otpHash.substring(0, 20) + '...');

  // Step 4: Verify OTP via /api/auth/verify-otp
  const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: otpCode })
  });
  assert.strictEqual(verifyRes.status, 200, 'verify-otp status was not 200');
  const verifyData = await verifyRes.json();
  console.log('✓ 4. OTP verified successfully:', verifyData.message);

  // Step 5: Complete Hospital Nurse signup
  const email = 'nurse.e2e.' + Date.now() + '@bedlink.org';
  const signupRes = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sister Mary Fernandes',
      email,
      phone,
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      role: 'HOSPITAL_NURSE',
      hospitalId: selectedHosp.id
    })
  });
  assert.strictEqual(signupRes.status, 201, 'Signup status was not 201');
  const signupData = await signupRes.json();
  console.log('✓ 5. Nurse signup succeeded:', signupData.user.name);
  console.log('✓ Assigned Hospital in response:', signupData.user.hospital_id);
  assert.strictEqual(signupData.user.hospital_id, selectedHosp.id);

  // Verify Set-Cookie header
  const setCookie = signupRes.headers.get('set-cookie');
  console.log('✓ Cookie header from backend:', setCookie ? setCookie.substring(0, 30) + '...' : 'none');
  assert(setCookie && setCookie.includes('token='), 'HTTP-only cookie not issued!');
  const token = signupData.access_token;
  assert(token, 'JWT access_token not issued!');

  // Step 6: Verify User record directly in PostgreSQL database
  const userInDb = await prisma.user.findFirst({
    where: { email }
  });
  assert(userInDb, 'User record not found in PostgreSQL!');
  assert.strictEqual(userInDb.name, 'Sister Mary Fernandes');
  assert.strictEqual(userInDb.role, 'hospital');
  assert.strictEqual(userInDb.hospitalId, selectedHosp.id);
  assert.strictEqual(userInDb.phone, phone);
  assert.strictEqual(userInDb.phoneVerified, true);
  assert(userInDb.passwordHash.startsWith('$2'), 'Password was not hashed!');
  assert(userInDb.passwordHash !== 'SecurePass123', 'Password stored as plaintext!');
  console.log('✓ 6. Verified User directly in PostgreSQL:');
  console.log('    ID:', userInDb.id);
  console.log('    Name:', userInDb.name);
  console.log('    Email:', userInDb.email);
  console.log('    Phone:', userInDb.phone, '(verified:', userInDb.phoneVerified + ')');
  console.log('    Role:', userInDb.role);
  console.log('    Hospital ID:', userInDb.hospitalId);
  console.log('    Password Hash:', userInDb.passwordHash.substring(0, 25) + '... (BCRYPT)');

  // Step 7: Call GET /api/auth/me with JWT token
  const meRes = await fetch('http://localhost:5000/api/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  assert.strictEqual(meRes.status, 200, '/api/auth/me status was not 200');
  const meData = await meRes.json();
  console.log('✓ 7. Profile verified via GET /api/auth/me:');
  console.log('    Name:', meData.name);
  console.log('    Role:', meData.role);
  console.log('    Hospital ID:', meData.hospital_id);
  assert.strictEqual(meData.hospital_id, selectedHosp.id);
  assert(!meData.password && !meData.password_hash, 'Password leaked in /api/auth/me');

  // Step 8: Login again using phone number and password
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password: 'SecurePass123' })
  });
  assert.strictEqual(loginRes.status, 200, 'Login with phone was not 200');
  const loginData = await loginRes.json();
  console.log('✓ 8. Logged in successfully using phone & password:', loginData.user.name);
  const nurseLoginToken = loginData.access_token;

  // Step 9: Authorization check - Nurse modifies own hospital availability (allowed)
  const patchOwnRes = await fetch('http://localhost:5000/api/hospitals/' + selectedHosp.id + '/availability', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + nurseLoginToken
    },
    body: JSON.stringify({ icu: 7 })
  });
  assert.strictEqual(patchOwnRes.status, 200, 'Own hospital availability patch failed');
  console.log('✓ 9. Nurse successfully updated assigned hospital (' + selectedHosp.id + ') availability');

  // Step 10: Authorization check - Nurse attempts to modify another hospital (must be rejected with 403)
  const otherHospId = selectedHosp.id === 'h-city' ? 'h-metro' : 'h-city';
  const patchOtherRes = await fetch('http://localhost:5000/api/hospitals/' + otherHospId + '/availability', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + nurseLoginToken
    },
    body: JSON.stringify({ icu: 99 })
  });
  assert.strictEqual(patchOtherRes.status, 403, 'Nurse was not forbidden from modifying another hospital');
  console.log('✓ 10. Nurse forbidden (403) from modifying other hospital (' + otherHospId + ') as required!');

  // Cleanup test user & OTP records
  await prisma.user.delete({ where: { id: userInDb.id } });
  await prisma.otpVerification.deleteMany({ where: { phone } });
  console.log('✓ Cleanup completed.');

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END ACCEPTANCE CRITERIA VERIFIED 100%! 🎉');
  console.log('======================================================');
})()
  .catch(e => {
    console.error('FAILED E2E:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
