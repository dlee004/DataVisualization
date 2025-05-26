import React, { useEffect, useState } from "react";
import Papa from "papaparse";

export default function PitchVisualizerUI() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({
    type: "All",
    detail: "All",
    pitch: "All",
    inning: "All",
  });
  const [selectedPitch, setSelectedPitch] = useState(null);

  useEffect(() => {
    fetch("/data/players.json")
      .then((res) => res.json())
      .then((playersData) => {
        setPlayers(playersData);
        setSelectedPlayerId(playersData[0].id);
        setPlayerInfo(playersData[0]);
      });
  }, []);

  useEffect(() => {
    if (!selectedPlayerId) return;
    const selected = players.find((p) => p.id === selectedPlayerId);
    if (!selected) return;
    setPlayerInfo(selected);

    fetch(`/data/${selected.id}_2024.csv`)
      .then((res) => res.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            const parsed = results.data.filter((d) => d.plate_x && d.plate_z);
            const enriched = parsed.map((d) => ({
              ...d,
              category: categorize(d),
            }));
            setData(enriched);
          },
        });
      });

    fetch(`/data/${selected.id}_2024_stats.csv`)
      .then((res) => res.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          complete: (results) => setStats(results.data[0]),
        });
      });
  }, [selectedPlayerId, players]);

  const categorize = (d) => {
    const desc = d.description?.toLowerCase() || "";
    const evt = d.events?.toLowerCase() || "";
    if (["single", "double", "triple", "home_run"].includes(evt)) return "Hit";
    if (evt.includes("out")) return "Out";
    if (desc.includes("ball")) return "Ball";
    if (
      desc.includes("called_strike") ||
      desc.includes("swinging_strike") ||
      desc.includes("foul")
    )
      return "Strike";
    return "Other";
  };

  const filteredData = data.filter((d) => {
    const desc = d.description?.toLowerCase() || "";
    const matchType = filter.type === "All" || d.category === filter.type;
    const matchDetail =
      filter.detail === "All" ||
      (filter.detail === "Called" && desc.includes("called_strike")) ||
      (filter.detail === "Swing" && desc.includes("swinging_strike")) ||
      (filter.detail === "Foul" && desc.includes("foul"));
    const matchPitch = filter.pitch === "All" || d.pitch_type === filter.pitch;
    const matchInning =
      filter.inning === "All" || String(d.inning) === String(filter.inning);
    return matchType && matchDetail && matchPitch && matchInning;
  });

  const pitchTypes = Array.from(new Set(data.map((d) => d.pitch_type))).filter(
    Boolean
  );

  const BOX_SIZE = 300,
    VIEW_SIZE = 700;
  const viewXmin = -1.5,
    viewXmax = 1.5,
    viewZmin = 1.0,
    viewZmax = 4.0;
  const ZONE_XMIN = -0.83,
    ZONE_XMAX = 0.83,
    ZONE_ZMIN = 1.5,
    ZONE_ZMAX = 3.5;
  const scaleX = BOX_SIZE / (viewXmax - viewXmin);
  const scaleZ = BOX_SIZE / (viewZmax - viewZmin);
  const zoneWidth = (ZONE_XMAX - ZONE_XMIN) * scaleX;
  const zoneHeight = (ZONE_ZMAX - ZONE_ZMIN) * scaleZ;
  const zoneLeft = (ZONE_XMIN - viewXmin) * scaleX;
  const zoneTop = (viewZmax - ZONE_ZMAX) * scaleZ;

  if (!playerInfo) return <div>Loading players...</div>;

  return (
    <div style={{ display: "flex", padding: 20, fontFamily: "sans-serif" }}>
      <div style={{ width: "20%", paddingRight: 20, textAlign: "center" }}>
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          style={{ marginBottom: 10 }}
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div
          style={{
            border: "1px solid #ccc",
            height: 300,
            width: 200,
            margin: "0 auto 10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            src={playerInfo.img}
            alt={playerInfo.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <h2>{playerInfo.name}</h2>
        <p>
          {playerInfo.team} · {playerInfo.number}
        </p>
        {stats && (
          <div style={{ marginTop: 20, textAlign: "left" }}>
            <h4>Stats (2024)</h4>
            <p>
              W: {stats.W} | L: {stats.L} | ERA: {stats.ERA} | IP: {stats.IP} |
              WAR: {stats.WAR}
            </p>
          </div>
        )}
      </div>

      <div style={{ width: "60%", textAlign: "center" }}>
        <div style={{ marginBottom: 10 }}>
          {["All", "Strike", "Ball", "Out", "Hit"].map((label) => (
            <button
              key={label}
              onClick={() => setFilter((f) => ({ ...f, type: label }))}
              style={{ margin: "0 5px" }}
            >
              {label}
            </button>
          ))}
          {["All", "Called", "Swing", "Foul"].map((detail) => (
            <button
              key={detail}
              onClick={() => setFilter((f) => ({ ...f, detail }))}
              style={{ margin: "0 3px" }}
            >
              {detail}
            </button>
          ))}
          <select
            onChange={(e) =>
              setFilter((f) => ({ ...f, inning: e.target.value }))
            }
            style={{ marginLeft: 20 }}
          >
            <option value="All">All</option>
            {[...Array(9)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            position: "relative",
            width: VIEW_SIZE,
            height: VIEW_SIZE,
            margin: "0 auto",
            border: "2px solid black",
            background: "#f5f5f5",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: BOX_SIZE,
              height: BOX_SIZE,
              transform: "translate(-50%, -50%)",
            }}
          >
            {[1, 2].map((i) => (
              <div
                key={`h${i}`}
                style={{
                  position: "absolute",
                  left: zoneLeft,
                  top: zoneTop + (zoneHeight * i) / 3,
                  width: zoneWidth,
                  height: 1,
                  backgroundColor: "black",
                }}
              />
            ))}
            {[1, 2].map((i) => (
              <div
                key={`v${i}`}
                style={{
                  position: "absolute",
                  top: zoneTop,
                  left: zoneLeft + (zoneWidth * i) / 3,
                  width: 1,
                  height: zoneHeight,
                  backgroundColor: "black",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: zoneLeft,
                top: zoneTop,
                width: zoneWidth,
                height: zoneHeight,
                border: "2px solid #222",
                boxSizing: "border-box",
              }}
            ></div>

            {filteredData.map((d, idx) => {
              const x = (d.plate_x - viewXmin) * scaleX;
              const y = (viewZmax - d.plate_z) * scaleZ;
              const colorMap = {
                Strike: "red",
                Ball: "blue",
                Out: "gray",
                Hit: "green",
                Other: "black",
              };
              return (
                <div
                  key={idx}
                  title={`Date: ${d.game_date}\nBatter: ${d.batter}\nDesc: ${d.description}\nEvent: ${d.events}`}
                  onClick={() => setSelectedPitch(d)}
                  style={{
                    position: "absolute",
                    left: x - 5,
                    top: y - 5,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: colorMap[d.category] || "black",
                    cursor: "pointer",
                  }}
                ></div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ width: "20%", paddingLeft: 20 }}>
        {["All", ...pitchTypes].map((type) => (
          <button
            key={type}
            style={{ display: "block", width: "100%", marginBottom: 10 }}
            onClick={() => setFilter((f) => ({ ...f, pitch: type }))}
          >
            {type}
          </button>
        ))}

        {selectedPitch && (
          <div
            style={{
              marginTop: 200,
              textAlign: "left",
              border: "1px solid #ccc",
              padding: 10,
            }}
          >
            <p>
              <strong>Date:</strong> {selectedPitch.game_date}
            </p>
            <p>
              <strong>Batter ID:</strong> {selectedPitch.batter}
            </p>
            <p>
              <strong>Pitch Info:</strong> {selectedPitch.pitch_name},{" "}
              {selectedPitch.release_speed} mph
            </p>
            <p>
              <strong>Description:</strong> {selectedPitch.description}
            </p>
            {selectedPitch.events && (
              <p>
                <strong>Event:</strong> {selectedPitch.des}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
