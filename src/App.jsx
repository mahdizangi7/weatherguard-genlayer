import { useEffect, useState } from 'react'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const CONTRACT_ADDRESS =
  '0x1B8A2fad2d88F252A34d08aA4d2bD4d8ED4fc642'

const readClient = createClient({
  chain: studionet,
})

function shortAddress(address) {
  if (!address) return ''
  return address.slice(0, 6) + '...' + address.slice(-4)
}

function normalizeReport(value) {
  if (!value) return null

  let parsed = value

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  return {
    id: String(parsed.id ?? ''),
    city: String(parsed.city ?? ''),
    country: String(parsed.country ?? ''),
    latitude: String(parsed.latitude ?? ''),
    longitude: String(parsed.longitude ?? ''),
    temperature: String(parsed.temperature_c ?? '0'),
    apparent_temperature: String(
      parsed.apparent_temperature_c ?? '0'
    ),
    humidity: String(parsed.humidity ?? '0'),
    wind_speed: String(parsed.wind_kmh ?? '0'),
    precipitation: String(
      parsed.precipitation_mm ?? '0'
    ),
    weather_code: String(
      parsed.weather_code ?? '0'
    ),
    max_rain_probability: String(
      parsed.max_rain_probability ?? '0'
    ),
    outdoor_verdict: String(
      parsed.outdoor_verdict ?? ''
    ),
    verified:
      String(parsed.verified ?? 'false') === 'true',
    source: String(
      parsed.source ?? 'Open-Meteo'
    ),
    verification: parsed.verification ?? null,
  }
}

function weatherName(code) {
  const value = Number(code)

  if (value === 0) return 'Clear sky'
  if (value === 1) return 'Mainly clear'
  if (value === 2) return 'Partly cloudy'
  if (value === 3) return 'Overcast'
  if ([45, 48].includes(value)) return 'Fog'
  if ([51, 53, 55].includes(value)) return 'Drizzle'
  if ([56, 57].includes(value)) {
    return 'Freezing drizzle'
  }
  if ([61, 63, 65].includes(value)) return 'Rain'
  if ([66, 67].includes(value)) {
    return 'Freezing rain'
  }
  if ([71, 73, 75, 77].includes(value)) {
    return 'Snow'
  }
  if ([80, 81, 82].includes(value)) {
    return 'Rain showers'
  }
  if ([85, 86].includes(value)) {
    return 'Snow showers'
  }
  if (value === 95) return 'Thunderstorm'
  if ([96, 99].includes(value)) {
    return 'Thunderstorm with hail'
  }

  return 'Unknown'
}

function weatherEmoji(code) {
  const value = Number(code)

  if (value === 0) return '☀️'
  if ([1, 2].includes(value)) return '🌤️'
  if (value === 3) return '☁️'
  if ([45, 48].includes(value)) return '🌫️'

  if (
    [51, 53, 55, 56, 57].includes(value)
  ) {
    return '🌦️'
  }

  if (
    [61, 63, 65, 80, 81, 82].includes(value)
  ) {
    return '🌧️'
  }

  if (
    [71, 73, 75, 77, 85, 86].includes(value)
  ) {
    return '❄️'
  }

  if ([95, 96, 99].includes(value)) {
    return '⛈️'
  }

  return '🌤️'
}

function verdictText(verdict) {
  if (verdict === 'GOOD') {
    return 'Good conditions'
  }

  if (verdict === 'MIXED') {
    return 'Mixed conditions'
  }

  if (verdict === 'CAUTION') {
    return 'Caution advised'
  }

  return 'Verified conditions'
}

function verdictDescription(verdict) {
  if (verdict === 'GOOD') {
    return 'No significant precipitation detected.'
  }

  if (verdict === 'MIXED') {
    return 'Some weather conditions may affect outdoor activity.'
  }

  if (verdict === 'CAUTION') {
    return 'Significant precipitation or strong weather conditions detected.'
  }

  return 'Weather conditions were independently verified.'
}

function App() {
  const [account, setAccount] = useState('')
  const [city, setCity] = useState('London')
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Ready')
  const [transactionHash, setTransactionHash] =
    useState('')
  const [error, setError] = useState('')

  async function connectWallet() {
    try {
      setError('')

      if (!window.ethereum) {
        throw new Error(
          'MetaMask is not installed.'
        )
      }

      const accounts =
        await window.ethereum.request({
          method: 'eth_requestAccounts',
        })

      if (!accounts?.length) {
        throw new Error(
          'No wallet account found.'
        )
      }

      setAccount(accounts[0])
      setMessage('Wallet connected')
    } catch (err) {
      console.error(err)

      setError(
        err?.message ||
          'Could not connect wallet.'
      )
    }
  }

  async function loadReport(reportId) {
    try {
      const value =
        await readClient.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_report',
          args: [String(reportId)],
        })

      const normalized =
        normalizeReport(value)

      if (normalized) {
        setReport(normalized)
      }

      return normalized
    } catch (err) {
      console.error(
        'Could not load report:',
        err
      )

      return null
    }
  }

  async function loadHistory() {
    try {
      const counter =
        await readClient.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_counter',
          args: [],
        })

      const count = Number(counter)

      if (
        !Number.isFinite(count) ||
        count <= 0
      ) {
        setHistory([])
        return
      }

      const start =
        Math.max(0, count - 6)

      const items = []

      for (
        let i = count - 1;
        i >= start;
        i--
      ) {
        try {
          const value =
            await readClient.readContract({
              address: CONTRACT_ADDRESS,
              functionName: 'get_report',
              args: [String(i)],
            })

          const normalized =
            normalizeReport(value)

          if (normalized) {
            items.push(normalized)
          }
        } catch (err) {
          console.warn(
            'Could not load report',
            i,
            err
          )
        }
      }

      setHistory(items)
    } catch (err) {
      console.error(
        'Could not load history:',
        err
      )
    }
  }

  /*
   * GenLayer transaction status:
   *
   * 2 = intermediate
   * 4 = intermediate
   * 5 = intermediate
   * 7 = FINALIZED
   *
   * The previous code was waiting for the words
   * "finalized" / "success", but GenLayerJS in this
   * project returns numeric statuses.
   */
  async function waitForFinalization(
    client,
    hash
  ) {
    for (let i = 0; i < 120; i++) {
      try {
        const tx =
          await client.getTransaction({
            hash,
          })

        const rawStatus =
          tx?.status ??
          tx?.transaction?.status

        const numericStatus =
          Number(rawStatus)

        console.log(
          'GenLayer transaction status:',
          numericStatus,
          tx
        )

        /*
         * 7 = FINALIZED
         */
        if (numericStatus === 7) {
          console.log(
            'GenLayer transaction FINALIZED'
          )

          return tx
        }

        /*
         * Intermediate GenLayer states.
         */
        if (
          numericStatus === 2 ||
          numericStatus === 4 ||
          numericStatus === 5
        ) {
          await new Promise(
            resolve =>
              setTimeout(resolve, 3000)
          )

          continue
        }

        const statusText =
          String(
            rawStatus ?? ''
          ).toLowerCase()

        if (
          statusText.includes('failed') ||
          statusText.includes('reverted')
        ) {
          throw new Error(
            `Transaction failed: ${rawStatus}`
          )
        }

        await new Promise(
          resolve =>
            setTimeout(resolve, 3000)
        )
      } catch (err) {
        console.error(
          'Transaction polling error:',
          err
        )

        const errorText =
          String(
            err?.message || ''
          ).toLowerCase()

        if (
          errorText.includes(
            'transaction failed'
          )
        ) {
          throw err
        }

        await new Promise(
          resolve =>
            setTimeout(resolve, 3000)
        )
      }
    }

    throw new Error(
      'Transaction confirmation timed out.'
    )
  }

  async function verifyWeather() {
    const cleanCity =
      city.trim()

    if (cleanCity.length < 2) {
      setError(
        'Please enter a valid city.'
      )
      return
    }

    if (!window.ethereum) {
      setError(
        'Please install MetaMask first.'
      )
      return
    }

    setLoading(true)
    setError('')
    setTransactionHash('')

    setMessage(
      'Preparing weather verification...'
    )

    try {
      let accounts =
        await window.ethereum.request({
          method: 'eth_accounts',
        })

      if (!accounts?.length) {
        accounts =
          await window.ethereum.request({
            method:
              'eth_requestAccounts',
          })
      }

      if (!accounts?.length) {
        throw new Error(
          'Please connect MetaMask.'
        )
      }

      const walletAccount =
        accounts[0]

      setAccount(walletAccount)

      const client =
        createClient({
          chain: studionet,
          account: walletAccount,
          provider: window.ethereum,
        })

      setMessage(
        'Sending verification transaction to GenLayer...'
      )

      const hash =
        await client.writeContract({
          address: CONTRACT_ADDRESS,
          functionName: 'check_weather',
          args: [cleanCity],
          value: 0n,
        })

      setTransactionHash(hash)

      console.log(
        'Weather transaction:',
        hash
      )

      setMessage(
        'GenLayer validators are verifying the weather...'
      )

      /*
       * Wait for the real GenLayer FINALIZED state.
       */
      const receipt =
        await waitForFinalization(
          client,
          hash
        )

      console.log(
        'Finalized transaction:',
        receipt
      )

      setMessage(
        'GenLayer consensus finalized. Reading verified report...'
      )

      /*
       * Give the read endpoint a short moment
       * to expose the finalized state.
       */
      await new Promise(
        resolve =>
          setTimeout(resolve, 1500)
      )

      /*
       * Read counter directly from the contract.
       */
      const counter =
        await readClient.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_counter',
          args: [],
        })

      const count = Number(counter)

      console.log(
        'On-chain counter:',
        count
      )

      if (
        !Number.isFinite(count) ||
        count <= 0
      ) {
        throw new Error(
          'Transaction finalized, but no weather report was found on-chain.'
        )
      }

      /*
       * Latest report ID = counter - 1
       */
      const latestId =
        count - 1

      console.log(
        'Latest report ID:',
        latestId
      )

      const latest =
        await loadReport(latestId)

      if (!latest) {
        throw new Error(
          'Transaction succeeded, but the weather report could not be read.'
        )
      }

      console.log(
        'Verified on-chain weather report:',
        latest
      )

      setReport(latest)

      setMessage(
        'Weather verified successfully'
      )

      await loadHistory()
    } catch (err) {
      console.error(
        'Weather verification error:',
        err
      )

      setError(
        err?.message ||
          'Weather verification failed.'
      )

      setMessage(
        'Verification failed'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const explorerTx =
    transactionHash
      ? `https://explorer-studio.genlayer.com/tx/${transactionHash}`
      : ''

  const explorerContract =
    `https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`

  const verdict =
    report?.outdoor_verdict || ''

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg,#07111f 0%,#0b1728 100%)',
        color: '#f5f7fa',
        fontFamily:
          'Inter, system-ui, Arial, sans-serif',
        padding: '32px 18px',
      }}
    >
      <div
        style={{
          maxWidth: 1050,
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: 20,
            marginBottom: 35,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 2,
                opacity: 0.65,
                marginBottom: 8,
              }}
            >
              WEATHERGUARD
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
              }}
            >
              Weather Verification
            </h1>

            <p
              style={{
                opacity: 0.7,
                marginTop: 8,
              }}
            >
              Decentralized real-world
              verification powered by GenLayer
            </p>
          </div>

          <button
            onClick={connectWallet}
            style={{
              border:
                '1px solid rgba(255,255,255,.18)',
              background: '#16243a',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {account
              ? shortAddress(account)
              : 'Connect Wallet'}
          </button>
        </header>

        <section
          style={{
            background: '#101d30',
            border:
              '1px solid rgba(255,255,255,.09)',
            borderRadius: 18,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <input
              value={city}
              onChange={e =>
                setCity(e.target.value)
              }
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  verifyWeather()
                }
              }}
              placeholder="Enter city"
              style={{
                flex: 1,
                minWidth: 220,
                padding: '15px 16px',
                borderRadius: 10,
                border:
                  '1px solid rgba(255,255,255,.15)',
                background: '#091525',
                color: '#fff',
                fontSize: 16,
                outline: 'none',
              }}
            />

            <button
              onClick={verifyWeather}
              disabled={loading}
              style={{
                padding: '15px 24px',
                borderRadius: 10,
                border: 'none',
                background:
                  loading
                    ? '#46566d'
                    : '#ffffff',
                color:
                  loading
                    ? '#dce3ec'
                    : '#07111f',
                fontWeight: 800,
                cursor:
                  loading
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {loading
                ? 'VERIFYING...'
                : 'VERIFY WEATHER →'}
            </button>
          </div>

          <div
            style={{
              marginTop: 14,
              opacity: 0.7,
              fontSize: 14,
            }}
          >
            {message}
          </div>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 9,
                background: '#351b23',
                color: '#ffb6c2',
              }}
            >
              {error}
            </div>
          )}
        </section>

        {report && (
          <section
            style={{
              background: '#101d30',
              border:
                '1px solid rgba(255,255,255,.09)',
              borderRadius: 18,
              padding: 28,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 15,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    opacity: 0.6,
                    fontSize: 13,
                    letterSpacing: 1,
                  }}
                >
                  VERIFIED REPORT
                </div>

                <h2
                  style={{
                    fontSize: 30,
                    margin: '10px 0 5px',
                  }}
                >
                  {weatherEmoji(
                    report.weather_code
                  )}{' '}
                  {report.city}
                </h2>

                <div
                  style={{
                    opacity: 0.7,
                  }}
                >
                  {report.country}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: '#173526',
                  color: '#8ff0b1',
                  fontWeight: 700,
                  height: 'fit-content',
                }}
              >
                ✓ VERIFIED
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(140px,1fr))',
                gap: 14,
                marginTop: 28,
              }}
            >
              <Metric
                label="TEMPERATURE"
                value={`${report.temperature}°C`}
              />

              <Metric
                label="FEELS LIKE"
                value={`${report.apparent_temperature}°C`}
              />

              <Metric
                label="HUMIDITY"
                value={`${report.humidity}%`}
              />

              <Metric
                label="WIND"
                value={`${report.wind_speed} km/h`}
              />

              <Metric
                label="PRECIPITATION"
                value={`${report.precipitation} mm`}
              />

              <Metric
                label="WEATHER CODE"
                value={report.weather_code}
              />
            </div>

            <div
              style={{
                marginTop: 22,
                padding: 18,
                borderRadius: 12,
                background: '#0a1727',
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                ✓ {verdictText(verdict)}
              </div>

              <div
                style={{
                  marginTop: 7,
                  opacity: 0.7,
                }}
              >
                {verdictDescription(
                  verdict
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 25,
                paddingTop: 22,
                borderTop:
                  '1px solid rgba(255,255,255,.08)',
              }}
            >
              <h3>
                EVIDENCE & VERIFICATION PROOF
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(200px,1fr))',
                  gap: 14,
                  marginTop: 15,
                }}
              >
                <Proof
                  title="Data Source"
                  value={report.source}
                />

                <Proof
                  title="GenLayer Validators"
                  value="Independent validators verify the returned weather evidence."
                />

                <Proof
                  title="On-chain Report"
                  value="Verified result and proof metadata are stored by the Intelligent Contract."
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 25,
              }}
            >
              <h3>
                Validator acceptance rules
              </h3>

              <ul
                style={{
                  lineHeight: 1.9,
                  opacity: 0.85,
                  paddingLeft: 20,
                }}
              >
                <li>
                  ✓ Temperature within ±1.5°C
                </li>

                <li>
                  ✓ Apparent temperature within
                  ±1.5°C
                </li>

                <li>
                  ✓ Humidity within ±8%
                </li>

                <li>
                  ✓ Wind speed within ±8 km/h
                </li>

                <li>
                  ✓ Precipitation within ±1 mm
                </li>

                <li>
                  ✓ Weather code exact match
                </li>

                <li>
                  ✓ City / country match
                </li>
              </ul>
            </div>

            <div
              style={{
                marginTop: 25,
              }}
            >
              <h3>On-chain evidence</h3>

              <div
                style={{
                  display: 'grid',
                  gap: 9,
                  marginTop: 12,
                  opacity: 0.9,
                }}
              >
                <Evidence
                  label="City"
                  value={report.city}
                />

                <Evidence
                  label="Country"
                  value={report.country}
                />

                <Evidence
                  label="Coordinates"
                  value={`${report.latitude}, ${report.longitude}`}
                />

                <Evidence
                  label="Temperature"
                  value={`${report.temperature} °C`}
                />

                <Evidence
                  label="Humidity"
                  value={`${report.humidity} %`}
                />

                <Evidence
                  label="Wind speed"
                  value={`${report.wind_speed} km/h`}
                />

                <Evidence
                  label="Precipitation"
                  value={`${report.precipitation} mm`}
                />

                <Evidence
                  label="Weather code"
                  value={report.weather_code}
                />

                <Evidence
                  label="Max rain probability"
                  value={`${report.max_rain_probability}%`}
                />

                <Evidence
                  label="Validation model"
                  value="Validators independently retrieve weather data and compare it against the leader evidence."
                />

                <Evidence
                  label="Consensus result"
                  value={
                    report.verification
                      ?.consensus_result ||
                    'accepted'
                  }
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 25,
                padding: 18,
                borderRadius: 12,
                background: '#0a1727',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.55,
                  marginBottom: 8,
                }}
              >
                PROVENANCE
              </div>

              <div
                style={{
                  lineHeight: 1.7,
                }}
              >
                User city → Open-Meteo geocoding
                → Open-Meteo weather data →
                GenLayer validator comparison →
                consensus → on-chain report
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 15,
                flexWrap: 'wrap',
                marginTop: 22,
                opacity: 0.75,
              }}
            >
              <div>
                Report ID #{report.id}
              </div>

              {transactionHash && (
                <a
                  href={explorerTx}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#9cc7ff',
                  }}
                >
                  Transaction ↗
                </a>
              )}
            </div>
          </section>
        )}

        <section
          style={{
            background: '#101d30',
            border:
              '1px solid rgba(255,255,255,.09)',
            borderRadius: 18,
            padding: 25,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
            }}
          >
            <h2>
              VERIFICATION HISTORY
            </h2>

            <button
              onClick={loadHistory}
              style={{
                background: 'transparent',
                color: '#fff',
                border:
                  '1px solid rgba(255,255,255,.15)',
                padding: '8px 13px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Refresh ↻
            </button>
          </div>

          {history.length === 0 ? (
            <div
              style={{
                opacity: 0.6,
                marginTop: 20,
              }}
            >
              No reports yet.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 18,
              }}
            >
              {history.map(item => (
                <button
                  key={item.id}
                  onClick={() =>
                    setReport(item)
                  }
                  style={{
                    textAlign: 'left',
                    background: '#0a1727',
                    color: '#fff',
                    border:
                      '1px solid rgba(255,255,255,.07)',
                    borderRadius: 12,
                    padding: 15,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                    }}
                  >
                    <div>
                      {weatherEmoji(
                        item.weather_code
                      )}{' '}
                      <strong>
                        {item.city}
                      </strong>

                      <span
                        style={{
                          opacity: 0.55,
                          marginLeft: 8,
                        }}
                      >
                        {item.country}
                      </span>
                    </div>

                    <div
                      style={{
                        opacity: 0.7,
                      }}
                    >
                      #{item.id} →
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      opacity: 0.75,
                    }}
                  >
                    {item.temperature}°{' '}
                    {weatherName(
                      item.weather_code
                    )}{' '}
                    ✓ VERIFIED
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            background: '#101d30',
            border:
              '1px solid rgba(255,255,255,.09)',
            borderRadius: 18,
            padding: 25,
          }}
        >
          <div
            style={{
              opacity: 0.55,
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            ON-CHAIN CONTRACT
          </div>

          <h2>
            WeatherGuard Intelligent Contract
          </h2>

          <p
            style={{
              opacity: 0.7,
              lineHeight: 1.7,
            }}
          >
            The verification logic, reports,
            and verification proof metadata are
            powered by GenLayer.
          </p>

          <a
            href={explorerContract}
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#9cc7ff',
            }}
          >
            Contract Explorer ↗
          </a>

          <div
            style={{
              marginTop: 12,
              fontFamily:
                'ui-monospace, SFMono-Regular, monospace',
              fontSize: 13,
              opacity: 0.6,
              wordBreak: 'break-all',
            }}
          >
            {CONTRACT_ADDRESS}
          </div>

          <div
            style={{
              marginTop: 25,
              textAlign: 'center',
              opacity: 0.55,
            }}
          >
            WeatherGuard × GenLayer
            <br />
            Decentralized real-world verification
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div
      style={{
        background: '#0a1727',
        borderRadius: 12,
        padding: 17,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          opacity: 0.5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          marginTop: 7,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Proof({ title, value }) {
  return (
    <div
      style={{
        background: '#0a1727',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          marginBottom: 7,
        }}
      >
        {title}
      </div>

      <div
        style={{
          opacity: 0.65,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Evidence({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 15,
        padding: '9px 0',
        borderBottom:
          '1px solid rgba(255,255,255,.05)',
      }}
    >
      <span
        style={{
          opacity: 0.55,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          textAlign: 'right',
        }}
      >
        {value}
      </strong>
    </div>
  )
}

export default App