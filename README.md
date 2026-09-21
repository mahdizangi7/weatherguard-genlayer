# WeatherGuard × GenLayer

WeatherGuard is a decentralized weather verification application built with GenLayer.

It allows a user to submit a city from the frontend, call a deployed GenLayer Intelligent Contract, independently retrieve weather evidence, validate that evidence through GenLayer validators, reach consensus, and store the verified report on-chain.

The project is designed to demonstrate how GenLayer can be used to verify real-world data instead of relying on a single unverified API response.

## Live Demo

https://frontend-beige-theta-14.vercel.app

## GitHub

https://github.com/mahdizangi7/weatherguard-genlayer

## GenLayer Contract

**Contract Address**

`0x1B8A2fad2d88F252A34d08aA4d2bD4d8ED4fc642`

**Contract Explorer**

https://explorer-studio.genlayer.com/address/0x1B8A2fad2d88F252A34d08aA4d2bD4d8ED4fc642

---

## How It Works

The WeatherGuard verification flow is:

```text
User enters city
        ↓
WeatherGuard frontend
        ↓
GenLayer Intelligent Contract
        ↓
Open-Meteo geocoding + weather evidence
        ↓
GenLayer validator retrieval
        ↓
Substantive evidence comparison
        ↓
Validator consensus
        ↓
Verified report stored on-chain
        ↓
Frontend reads finalized report
```

### Step-by-step

1. The user enters a city in the WeatherGuard frontend.
2. The frontend sends `check_weather(city)` to the deployed GenLayer contract.
3. The contract retrieves weather evidence from Open-Meteo.
4. GenLayer's nondeterministic execution allows validators to independently retrieve the relevant real-world evidence.
5. Validators compare their independently retrieved weather snapshot against the leader evidence.
6. The validation process checks substantive weather fields rather than merely checking that a source URL exists.
7. The validators reproduce and verify the resulting outdoor-weather verdict.
8. GenLayer reaches consensus on the verification result.
9. The verified report and verification metadata are stored on-chain.
10. The frontend reads the finalized report from the contract and displays the weather data, verification result, provenance, and evidence.

---

## Frontend → GenLayer Contract

The frontend is a real client integration using `genlayer-js` and GenLayer Studionet.

The main write operation is:

```text
check_weather(city)
```

After the transaction is finalized, the frontend reads the latest report using:

```text
get_latest_id()
        ↓
get_report(report_id)
```

The frontend does **not** require the user to manually execute the verification workflow inside GenLayer Studio.

The complete flow is performed from the WeatherGuard application:

```text
Frontend
   ↓
check_weather(city)
   ↓
GenLayer consensus
   ↓
FINALIZED transaction
   ↓
get_latest_id()
   ↓
get_report(report_id)
   ↓
Verified Weather Report
```

This provides a direct frontend-to-contract read/write workflow using the deployed contract.

---

## Independent Validator Verification

WeatherGuard does not treat the leader's weather response as sufficient proof by itself.

Validators independently retrieve weather evidence and compare the resulting data against the leader evidence.

The validation process checks substantive fields including:

* City
* Country
* Temperature
* Apparent temperature
* Humidity
* Wind speed
* Precipitation
* Weather code
* Outdoor verdict

Example tolerance rules include:

| Field                | Validation Rule          |
| -------------------- | ------------------------ |
| Temperature          | ±1.5°C                   |
| Apparent temperature | ±1.5°C                   |
| Humidity             | ±8%                      |
| Wind speed           | ±8 km/h                  |
| Precipitation        | ±1 mm                    |
| Weather code         | Exact match              |
| City / country       | Must match               |
| Outdoor verdict      | Independently reproduced |

These checks are intended to verify that validators agree on the actual weather evidence, rather than merely agreeing that an external source exists.

---

## Proof Provenance

WeatherGuard exposes the provenance of the verification result.

The verification chain is:

```text
User city
    ↓
Open-Meteo geocoding
    ↓
Open-Meteo weather data
    ↓
Leader evidence
    ↓
Independent validator evidence
    ↓
Substantive field comparison
    ↓
Validator consensus
    ↓
On-chain verified report
```

Each stored report can contain verification metadata describing how the result was produced.

Relevant metadata includes:

* Verification method
* Data source
* Leader validation
* Validator validation
* Evidence validation
* Verdict validation
* Consensus result
* Substantive validation
* Decision agreement

This makes the result more than a simple weather API response: the application records the verification path that produced the final result.

---

## Example On-Chain Result

Example verified transaction:

https://explorer-studio.genlayer.com/tx/0x653458a24f8cb71fe9937d8097582291b0a9901966ef8214f2259e70abfeac07

The transaction produced a finalized WeatherGuard report containing weather evidence, the verification result, and verification metadata.

---

## Why GenLayer?

Weather data is external, dynamic, and can change between requests.

A normal frontend application could retrieve weather data from an API and immediately display the response. However, that alone does not provide decentralized verification of the returned real-world data.

WeatherGuard uses GenLayer's Intelligent Contract and validator mechanism to introduce an independent verification layer:

```text
External real-world data
        ↓
Leader retrieval
        ↓
Independent validator retrieval
        ↓
Evidence comparison
        ↓
Consensus
        ↓
On-chain result
```

The key purpose of GenLayer in WeatherGuard is therefore not simply retrieving weather data.

It is using decentralized validator execution and consensus to verify the external evidence before accepting the result as a verified on-chain report.

---

## Smart Contract Functions

### `check_weather(city)`

Creates a weather verification request.

The contract retrieves weather evidence, executes the GenLayer verification process, reaches validator consensus, and stores the resulting report.

### `get_report(report_id)`

Returns a previously stored weather verification report.

### `get_latest_id()`

Returns the ID of the latest stored weather report.

The frontend uses this function after a finalized verification transaction to locate the newly created report.

---

## Frontend Verification Flow

The frontend waits for the GenLayer transaction to reach the finalized state before reading the resulting report.

```text
1. Connect wallet
       ↓
2. Enter city
       ↓
3. Call check_weather(city)
       ↓
4. Wait for GenLayer FINALIZED
       ↓
5. Call get_latest_id()
       ↓
6. Call get_report(latest_id)
       ↓
7. Display verified report
       ↓
8. Refresh verification history
```

This prevents the frontend from assuming that a transaction has produced a report before GenLayer consensus has finalized the execution.

---

## Verification History

WeatherGuard also provides an on-chain verification history.

The frontend:

1. Calls `get_latest_id()`.
2. Determines the most recent report ID.
3. Reads the latest reports using `get_report(report_id)`.
4. Displays the available verified reports in the frontend.

The history therefore comes from the deployed contract rather than from browser-local state.

---

## Technology

* React
* Vite
* JavaScript
* genlayer-js
* GenLayer Studionet
* GenLayer Intelligent Contract
* Open-Meteo
* MetaMask
* Vercel

---

## Reviewer Requirements Addressed

### 1. Real frontend contract interaction

The frontend directly interacts with the deployed GenLayer contract.

Users can initiate the verification from the WeatherGuard application without manually opening GenLayer Studio and executing contract methods themselves.

The frontend performs both:

* Contract write: `check_weather(city)`
* Contract reads: `get_latest_id()` and `get_report(report_id)`

---

### 2. Stronger proof provenance

WeatherGuard records verification metadata alongside the weather report.

The provenance describes the path from the user's requested city through external weather evidence, validator comparison, consensus, and the final on-chain report.

---

### 3. Substantive validator checks

Validators do not merely verify that a weather source exists.

They independently retrieve weather evidence and compare substantive fields such as:

* Temperature
* Apparent temperature
* Humidity
* Wind speed
* Precipitation
* Weather code
* Location identity
* Outdoor verdict

The comparison uses explicit tolerances for numeric fields and exact or semantic agreement where appropriate.

---

### 4. Consensus-backed result

The final report is produced through GenLayer's validator and consensus mechanism.

The frontend waits for the verification transaction to reach the finalized state before reading and displaying the resulting report.

---

### 5. On-chain verification history

Verified reports are stored by the Intelligent Contract and can be retrieved through:

```text
get_latest_id()
get_report(report_id)
```

This allows the frontend to reconstruct recent verification history directly from the deployed contract.

---

## Project Structure

```text
weatherguard-genlayer/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── README.md
│
└── README.md
```

---

## Contract

**Network:** GenLayer Studionet

**Contract:**

```text
0x1B8A2fad2d88F252A34d08aA4d2bD4d8ED4fc642
```

**Primary verification method:**

```text
check_weather(city)
```

**Report retrieval:**

```text
get_latest_id()
get_report(report_id)
```

---

## Summary

WeatherGuard demonstrates a practical use case for GenLayer: verifying dynamic real-world weather information through independent validator retrieval, substantive evidence comparison, consensus, and on-chain storage.

Instead of trusting a single frontend response, WeatherGuard creates a verification pipeline in which external weather evidence is independently checked before the result becomes an on-chain verified report.

**WeatherGuard × GenLayer**

Decentralized real-world weather verification.
