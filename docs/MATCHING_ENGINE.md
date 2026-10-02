# BEDLINK — MATCHING & SCORING ENGINE
**Deterministic Multi-Factor Patient-Hospital Ranking**

---

## 1. Overview

The BedLink Matching Engine evaluates candidate hospitals within a configurable geographical search radius against an emergency patient's clinical requirements. The matching algorithm is **100% deterministic**, reproducible, and produces a normalized score between **0 and 100**.

---

## 2. Configurable Environment Variables

```env
MATCHING_RADIUS_KM=15              # Search radius in kilometers (default: 15 km)
DEFAULT_EMERGENCY_SPEED_KMPH=40    # Base emergency transit speed (default: 40 km/h)
DISPATCH_PREP_MINUTES=2            # Ambulance dispatch and handover buffer (default: 2 mins)
```

---

## 3. Distance & ETA Calculations

### 3.1 Haversine Distance Formula
Implemented in `backend/src/utils/distance.ts`:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c \quad \text{where } R = 6371\text{ km}$$

All coordinates are strictly validated:
$$-90 \le \text{lat} \le 90, \quad -180 \le \text{lon} \le 180$$

### 3.2 Transit ETA Calculation
Implemented in `backend/src/services/eta.service.ts`:

$$\text{etaMinutes} = \left(\frac{\text{distanceKm}}{\text{speedKmph}}\right) \times 60 + \text{prepMinutes}$$

Example:
$$d = 5\text{ km}, \quad s = 40\text{ km/h} \implies \text{Transit ETA} = 7.5\text{ minutes}$$

---

## 4. Multi-Factor Scoring Engine

Component weights are configured as follows:

| Factor | Weight | Score Definition |
|---|---|---|
| **Resource Match** | **35%** | $\frac{\text{Fulfilled Requirements}}{\text{Total Required Resources}} \times 100$ |
| **ETA** | **25%** | $\max(0, 100 - \text{etaMinutes} \times 5)$ |
| **Data Freshness** | **15%** | $\max(0, 100 - \text{dataAgeMinutes} \times 5)$ |
| **Hospital Load** | **15%** | $\max(0, 100 - \text{currentLoadPercentage})$ |
| **Distance** | **10%** | $\max\left(0, 100 - \frac{\text{distanceKm}}{\text{MATCHING\_RADIUS\_KM}} \times 100\right)$ |

### Final Score Formula

$$\text{finalScore} = 0.35 \cdot S_{\text{resource}} + 0.25 \cdot S_{\text{eta}} + 0.15 \cdot S_{\text{freshness}} + 0.15 \cdot S_{\text{load}} + 0.10 \cdot S_{\text{distance}}$$

All sub-scores and final scores are clamped to $[0, 100]$ with two decimal places of precision.

---

## 5. Hard Eligibility vs. Partial Match

1. **Fully Eligible**:
   $$\text{fulfillmentPercentage} = 100\% \implies \text{isFullyEligible} = \text{true}$$
2. **Partial Match**:
   $$\text{fulfillmentPercentage} < 100\% \implies \text{isFullyEligible} = \text{false}$$

Partial matches are preserved and clearly marked in the rankings so dispatchers retain visibility in high-demand disaster or overflow scenarios.

---

## 6. Freshness & Data Age Tracking

Every hospital record tracks `last_updated`. The engine returns continuous `dataAgeMinutes`:
```json
{
  "lastUpdated": "2026-10-02T10:42:00Z",
  "dataAgeMinutes": 2.4,
  "freshnessScore": 88
}
```
This directly fuels the frontend display (e.g., *"Updated 2 min ago"*).

---

## 7. Natural Language Explanation (Groq AI)

Implemented in `backend/src/services/groq.service.ts`:
- **Model**: `llama-3.3-70b-versatile`
- **Purpose**: Generates concise, operational rationale for dispatcher review.
- **Safety Boundary**: Groq **never** calculates scores, changes rankings, or makes booking decisions. It only explains the deterministic data output.
- **Resilience**: If Groq is unconfigured or encounters API rate limits, a deterministic fallback template generates the exact clinical rationale without failing the request.
