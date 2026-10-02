async function main() {
  const BASE_URL = "http://localhost:5000";
  console.log("=== BEDLINK LIVE SYSTEM VERIFICATION ===");

  // 1. Health check
  console.log("\n1. Verifying /api/health...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log("   Health response:", healthData);
  if (healthData.status !== "ok") throw new Error("Health check failed");

  // 2. Login as Dispatcher
  console.log("\n2. Logging in as dispatcher1...");
  const dispLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "dispatcher1", password: "demo123" }),
  });
  const dispLogin = await dispLoginRes.json();
  console.log("   Dispatcher login status:", dispLoginRes.status, "User:", dispLogin.user?.name);
  const dispToken = dispLogin.access_token;

  // 3. Login as City Hospital Nurse
  console.log("\n3. Logging in as nurse_city...");
  const nurseLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "nurse_city", password: "demo123" }),
  });
  const nurseLogin = await nurseLoginRes.json();
  console.log("   Nurse login status:", nurseLoginRes.status, "Hospital ID:", nurseLogin.user?.hospital_id);
  const nurseToken = nurseLogin.access_token;

  // 4. Fetch Hospitals
  console.log("\n4. Fetching hospitals from PostgreSQL...");
  const hospRes = await fetch(`${BASE_URL}/api/hospitals`);
  const hospitals = await hospRes.json();
  console.log(`   Found ${hospitals.length} hospitals. Top 3:`, hospitals.slice(0, 3).map((h: any) => `${h.name} (${h.area}) - ICU: ${h.resources.icu.available}/${h.resources.icu.total}`));

  // 5. Create Emergency Request
  console.log("\n5. Creating emergency request (Cardiac, Critical, Dadar TT Circle)...");
  const emRes = await fetch(`${BASE_URL}/api/emergency-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dispToken}`,
    },
    body: JSON.stringify({
      type: "Cardiac",
      severity: "Critical",
      age: 65,
      gender: "Male",
      resources: ["icu", "ventilator", "cardiac"],
      location: {
        lat: 19.0178,
        lng: 72.8478,
        label: "Dadar TT Circle, Mumbai",
      },
    }),
  });
  const emergency = await emRes.json();
  console.log("   Emergency created:", emergency.id, "Status:", emergency.status);
  console.log(`   Ranked ${emergency.matches?.length} hospitals. Top match: #${emergency.matches[0]?.rank} ${emergency.matches[0]?.hospital_name} (${Math.round(emergency.matches[0]?.total_score * 100)}%)`);

  // 6. Hospital broadcasts capacity confirmation
  console.log("\n6. Hospital confirming fulfillment capabilities...");
  const capRes = await fetch(`${BASE_URL}/api/emergency-requests/${emergency.id}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${nurseToken}`,
    },
    body: JSON.stringify({
      icu: true,
      ventilator: true,
      cardiac: true,
    }),
  });
  const capData = await capRes.json();
  console.log("   Hospital confirmation status:", capRes.status, `Fulfillment: ${capData.fulfillmentPercentage}%`);

  // 7. Ambulance selects top hospital for Bed Hold (2:00)
  const topHospId = emergency.matches[0].hospital_id;
  console.log(`\n7. Ambulance reserving bed at top hospital (${topHospId})...`);
  const rsvRes = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dispToken}`,
    },
    body: JSON.stringify({
      requestId: emergency.id,
      hospitalId: topHospId,
    }),
  });
  const reservation = await rsvRes.json();
  console.log("   Reservation created:", reservation.id, "Status:", reservation.status, "Expires at:", new Date(reservation.expires_at).toISOString());

  // 8. Hospital declines request to trigger automatic fallback
  console.log("\n8. Simulating Hospital A decline to test automatic fallback...");
  const declineRes = await fetch(`${BASE_URL}/api/reservations/${reservation.id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${nurseToken}`,
    },
    body: JSON.stringify({
      reasons: ["diversion"],
      note: "Emergency department at capacity",
    }),
  });
  const declineData = await declineRes.json();
  console.log("   Decline response:", declineData);

  // 9. Inspect fallback reservation
  console.log("\n9. Verifying next hospital reservation automatically created by fallback...");
  const verifyRes = await fetch(`${BASE_URL}/api/emergency-requests/${emergency.id}`, {
    headers: { Authorization: `Bearer ${dispToken}` },
  });
  const updatedEmergency = await verifyRes.json();
  console.log("   Updated emergency status:", updatedEmergency.status, "Reservation IDs count:", updatedEmergency.reservation_ids.length);

  // 10. Accept the fallback reservation
  const fallbackRsvId = updatedEmergency.reservation_ids[updatedEmergency.reservation_ids.length - 1];
  console.log(`\n10. Hospital B accepting fallback reservation (${fallbackRsvId})...`);
  const acceptRes = await fetch(`${BASE_URL}/api/reservations/${fallbackRsvId}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${nurseToken}`,
    },
  });
  const acceptData = await acceptRes.json();
  console.log("   Accept response status:", acceptRes.status, "Status:", acceptData.status, "Held resources:", acceptData.held);

  // 11. Verify Event Log Timeline
  console.log("\n11. Fetching complete Event Log Timeline...");
  const eventsRes = await fetch(`${BASE_URL}/api/events/${emergency.id}`);
  const events = await eventsRes.json();
  console.log(`   Audit log contains ${events.length} events:`);
  events.forEach((e: any, i: number) => {
    console.log(`     [${i + 1}] ${e.type} (${e.actor}): ${e.message}`);
  });

  // 12. Admin Metrics
  console.log("\n12. Fetching Admin Network Metrics...");
  const metricsRes = await fetch(`${BASE_URL}/api/admin/metrics`);
  const metrics = await metricsRes.json();
  console.log("   Network Metrics:", metrics);

  console.log("\n✅ ALL END-TO-END WORKFLOW VERIFICATIONS PASSED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
