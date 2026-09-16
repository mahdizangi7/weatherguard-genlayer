# WeatherGuard × GenLayer

WeatherGuard is a decentralized weather verification application built with GenLayer.

It allows a user to submit a city from the frontend, call a deployed GenLayer smart contract, independently retrieve weather evidence, validate the evidence through GenLayer validators, reach consensus, and store the verified report on-chain.

## Live Demo

https://frontend-beige-theta-14.vercel.app

## GitHub

https://github.com/mahdizangi7/weatherguard-genlayer

## GenLayer Contract

Contract:
0x1B8A2fad2d88F252A34d08aA4d2bD4d8ED4fc642

Contract Explorer:
https://explorer-studio.genlayer.com/address/0x1B8A2fad2d88F252A34d08aA4d2bD4d8ED4fc642

## How It Works

1. The user enters a city in the WeatherGuard frontend.
2. The frontend calls the deployed GenLayer contract.
3. The contract retrieves weather data from Open-Meteo.
4. GenLayer's nondeterministic execution allows validators to independently retrieve the same type of evidence.
5. Validators compare their independent weather snapshot against the leader result.
6. Validation checks substantive weather fields rather than only checking that a source URL exists.
7. The outdoor verdict is independently reproduced.
8. Consensus is reached.
9. The verified report is stored on-chain.
10. The frontend reads the on-chain report and displays the verification result and provenance.

## Frontend → Contract

The frontend uses `genlayer-js` and connects to GenLayer Studionet.

The main write operation is:

`check_weather(city)`

The frontend also reads data from the contract using:

- `get_counter()`
- `get_report(report_id)`
- `get_latest_id()`

This is a real client read/write integration with the deployed contract.

The workflow does not require the user to manually perform the verification in GenLayer Studio.

## Independent Validator Verification

Validators independently retrieve weather evidence and compare it with the leader evidence.

The validation model checks:

- City
- Country
- Temperature
- Apparent temperature
- Humidity
- Wind speed
- Precipitation
- Weather code
- Outdoor verdict

Example tolerance rules include:

- Temperature: ±1.5°C
- Apparent temperature: ±1.5°C
- Humidity: ±8%
- Wind speed: ±8 km/h
- Precipitation: ±1 mm

The weather code and location identity are also checked.

## Proof Provenance

Each stored report includes verification metadata describing how the result was produced.

The provenance chain is:

User city
→ Open-Meteo geocoding
→ Open-Meteo weather data
→ GenLayer validator comparison
→ consensus
→ on-chain report

The report records metadata including:

- verification method
- data source
- leader validation
- validator validation
- evidence validation
- verdict validation
- consensus result
- substantive validation
- decision agreement

## Example On-Chain Result

Example verified transaction:

https://explorer-studio.genlayer.com/tx/0x653458a24f8cb71fe9937d8097582291b0a9901966ef8214f2259e70abfeac07

The transaction produced a finalized WeatherGuard report containing weather evidence, the verification result, and validator metadata.

## Why GenLayer?

Weather data is external and can change between requests.

WeatherGuard uses GenLayer to make the verification process consensus-driven rather than relying on a single frontend API response.

The important part of the application is not simply displaying weather data. The contract uses GenLayer's validator mechanism to independently retrieve and compare evidence before storing the verified result on-chain.

## Smart Contract Functions

### `check_weather(city)`

Creates a weather verification request and stores the resulting consensus-verified report.

### `get_report(report_id)`

Returns a previously stored verification report.

### `get_latest_id()`

Returns the latest report ID.

### `get_counter()`

Returns the number of reports created.

## Technology

- React
- Vite
- JavaScript
- genlayer-js
- GenLayer Studionet
- GenLayer smart contract
- Open-Meteo
- MetaMask
- Vercel

## Reviewer Requirements Addressed

The implementation addresses the following requirements:

### Real frontend contract interaction

The frontend directly calls the deployed GenLayer contract instead of sending users to Studio to manually execute the workflow.

### Stronger proof provenance

Reports contain explicit source and verification metadata describing the evidence and validation path.

### Substantive validator checks

Validators independently retrieve weather data and compare substantive evidence fields against the leader result.

### Consensus-backed result

The final report is produced after GenLayer validator agreement and is stored on-chain.

## Project Structure

```text
frontend/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── style.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md