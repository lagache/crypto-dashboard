import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import mcache from 'memory-cache'

const API_URL = process.env.REACT_APP_API_URL;

export interface SentimentRatio {
  positive: number;
  negative: number;
  neutral: number;
  unknown: number;
}

export interface Result {
  timeMs: number;
  coin: string;
  tweetIds: Array<string>;
  usdRate: number;
  score: string;
  scoreByFollowers: string;
  sentiment: SentimentRatio;
  sentimentByFollowers: SentimentRatio;
}

async function fetcher(url: string) {
  const cachedData = mcache.get(url);
  if (cachedData) {
    return cachedData
  }
  const response = await fetch(url);
  const data = await response.json();
  mcache.put(url, data);
  return data;
}

function useResponse(coin: string, start: number, end: number) {
  const [data, setResponse] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    async function fetchAllData() {
      try {
        const results = [];
        let startPoint = start;
        setLoading(true);
        while (startPoint) {
          const data = await fetcher(`${API_URL}/bitcoin/${startPoint}/${end}`);
          results.push(...data.results);
          startPoint = data.nextStartTime;
        }
        setLoading(false);
        setResponse(results);
      } catch (error) {
        setLoading(false);
        setError(error);
        setResponse(null);
      }
    }
    fetchAllData();
  }, [start, end]);
  return { data, loading, error };
}

function twentyFourHourFormat(date: Date) {
  const [hours, min] = [date.getHours(), date.getMinutes()].map((x) =>
      x.toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      })
  );
  return `${hours}:${min}`;
}

function transformTrends(data: Result[]) {
  return data.map((x) => ({
        ...x,
        tweetCount: x.tweetIds.length,
      }
  ));
}

const now = new Date();
now.setSeconds(0);
now.setMilliseconds(0);

const DURATION_OPTIONS = ['1h','2h','4h','1d','2d','1w']

function getStartTime(duration: string, fromTime: number) {
  const [v, t] = duration.split('');
  const offset = Number(v) * (t === 'h' ? 1 : t === 'd' ? 24 : 24 * 7) * 60 * 60 * 1000;
  const startTime = new Date(fromTime - offset);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  return startTime;
}

function App() {
  const [fromTime, setFromTime] = useState(new Date().getTime());
  const [selected, setSelected] = useState<number>();
  const [coin, setCoin] = useState('btc');
  const [duration, setDuration] = useState('4h')
  const [datatype, setDatatype] = useState<'tweetCount'|'sentiment'|'sentimentByFollowers'>('sentiment');
  const startTime = getStartTime(duration, fromTime);
  const { data, loading } = useResponse(
      coin,
      startTime.getTime(),
      now.getTime()
  );
  const selectedResult = useMemo(() => {
    if (!data) return;
    if (!selected) return data[data.length - 1];
    return data?.find((result) => result.timeMs === selected);
  }, [data, selected]);
  return (
      <div className="App">
        <header className="App-header">
          <h1 style={{ margin: "5px 0px" }}>Twitter Bitcoin Tracker</h1>
          {/*<select style={{ width: 120, margin: "20px 0px"}} value={coin} onChange={e => setCoin(e.target.value)}>*/}
          {/*  <option value="btc">Bitcoin</option>*/}
          {/*  <option value="eth">Ethereum</option>*/}
          {/*  <option value="bnb">Binance Coin</option>*/}
          {/*  <option value="xrp">XRP</option>*/}
          {/*  <option value="sol">Solana</option>*/}
          {/*  <option value="luna">Terra</option>*/}
          {/*  <option value="ada">Cardano</option>*/}
          {/*  <option value="dot">Polkadot</option>*/}
          {/*  <option value="doge">Dogecoin</option>*/}
          {/*  <option value="avax">Avalanche</option>*/}
          {/*</select>*/}
          <h5 style={{ color: "gray", margin: "1px 0px 15px 0px" }}>
            From {startTime.toLocaleString("en-GB")} to{" "}
            {now.toLocaleString("en-GB")}
          </h5>
          <fieldset>
            <legend>Options:</legend>
            <div style={{margin: 5}} onClick={() => setDatatype('tweetCount')}>
              <input type="radio" checked={datatype === 'tweetCount'} />
              <label htmlFor="mode">Tweet Count</label>
            </div>
            <div style={{margin: 5}} onClick={() => setDatatype('sentiment')}>
              <input type="radio" checked={datatype === 'sentiment'} />
              <label htmlFor="mode">Tweet Sentiment</label>
            </div>
            <div style={{margin: 5}} onClick={() => setDatatype('sentimentByFollowers')}>
              <input type="radio" checked={datatype === 'sentimentByFollowers'} />
              <label htmlFor="mode">Tweet Sentiment by reach</label>
            </div>
          </fieldset>

        </header>
        {loading ? (
            <div style={{margin: '20px'}}>Loading...</div>
        ) : (
            <>
              <div className="controls">
                <span className="refresh" onClick={() => {mcache.clear(); setFromTime(new Date().getTime())}}><button>&#8634;</button></span>
                <span className="duration-group">
              {DURATION_OPTIONS.map(d => <button key={d} className={`${d === duration ? 'active': ''}`} onClick={() => setDuration(d)}>{d}</button>)}
            </span>
              </div>
              <ResponsiveContainer key={duration} width={"100%"} height={500}>
                <AreaChart
                    data={data ? transformTrends(data) : undefined}
                    onClick={(x: any) =>
                        x && x.activeLabel && setSelected(x.activeLabel)
                    }
                    margin={{ left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient
                        id="tweetCountGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                      <stop offset="15%" stopColor="#1D9BF0" stopOpacity={0.8} />
                      <stop offset="85%" stopColor="#1D9BF0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                      tickFormatter={(value) => twentyFourHourFormat(new Date(value))}
                      dataKey="timeMs"
                      domain={["auto", "auto"]}
                      scale="time"
                      type="number"
                  />
                  <YAxis yAxisId="left" domain={["auto", "auto"]} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      formatter={(value: string, name: string, props: any) =>
                          name === "usdRate"
                              ? [`$${Number(props.payload.usdRate)}`, "BTC-USD"]
                              : name === 'tweetCount'
                                  ? [value, "Tweet Count"]
                                  : [value, name.split('.')[1]]
                      }
                  />
                  <ReferenceLine alwaysShow x={selected} stroke="green" yAxisId="left" />
                  {datatype === 'tweetCount' && <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="tweetCount"
                      stroke="#1D9BF0"
                      fillOpacity={1}
                      fill="url(#tweetCountGradient)"
                  />
                  }
                  {['sentiment','sentimentByFollowers'].includes(datatype) &&
                      <>
                        <Area
                            yAxisId="right"
                            type="monotone"
                            stackId="1"
                            dataKey={`${datatype}.unknown`}
                            stroke="#FFAD61"
                            fill="#FFAD61"
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            stackId="1"
                            dataKey={`${datatype}.negative`}
                            stroke="#F87580"
                            fill="#F87580"
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            stackId="1"
                            dataKey={`${datatype}.neutral`}
                            stroke="#FFEB6B"
                            fill="#FFEB6B"
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            stackId="1"
                            dataKey={`${datatype}.positive`}
                            stroke="#61D6A3"
                            fill="#61D6A3"
                        />
                      </>
                  }
                  <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="usdRate"
                      stroke="#009C64"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorUv)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/*<div style={{ flex: 1, margin: "20px 0px" }}>*/}
              {/*  <div style={{ display: "flex", gap: 15, overflowX: "scroll" }}>*/}
              {/*    {selectedResult?.tweetIds?.slice(0, 10).map((id) => <TwitterTweetEmbed key={id} tweetId={id} />)}*/}
              {/*  </div>*/}
              {/*</div>*/}
            </>
        )}
      </div>
  );
}

export default App;
