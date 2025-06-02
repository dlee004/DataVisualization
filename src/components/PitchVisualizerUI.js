import React, { useEffect, useState, useCallback } from "react";
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

  const [isMembersPopupOpen, setIsMembersPopupOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState("dashboard");

  const [leftPlayer, setLeftPlayer] = useState(null);
  const [rightPlayer, setRightPlayer] = useState(null);
  const [leftPlayerData, setLeftPlayerData] = useState([]);
  const [rightPlayerData, setRightPlayerData] = useState([]);
  const [leftPlayerStats, setLeftPlayerStats] = useState(null);
  const [rightPlayerStats, setRightPlayerStats] = useState(null);

  const [leftFilter, setLeftFilter] = useState({
    type: "All",
    detail: "All",
    pitch: "All",
    inning: "All",
  });
  const [rightFilter, setRightFilter] = useState({
    type: "All",
    detail: "All",
    pitch: "All",
    inning: "All",
  });

  const [isMultiViewOpen, setIsMultiViewOpen] = useState(false);
  const [multiViewEnabled, setMultiViewEnabled] = useState(false);
  const [multiViewFilters, setMultiViewFilters] = useState([
    {
      type: "All",
      detail: "All",
      pitch: "All",
      inning: "All",
      label: "View 1",
    },
    {
      type: "All",
      detail: "All",
      pitch: "All",
      inning: "All",
      label: "View 2",
    },
    {
      type: "All",
      detail: "All",
      pitch: "All",
      inning: "All",
      label: "View 3",
    },
    {
      type: "All",
      detail: "All",
      pitch: "All",
      inning: "All",
      label: "View 4",
    },
  ]);

  useEffect(() => {
    fetch("/data/players.json")
      .then((res) => res.json())
      .then((playersData) => {
        setPlayers(playersData);
        setSelectedPlayerId(playersData[0].id);
        setPlayerInfo(playersData[0]);
      });
  }, []);

  const loadPlayerData = useCallback(
    (playerId, setDataFunc, setInfoFunc, setStatsFunc) => {
      const selected = players.find((p) => p.id === playerId);
      if (!selected) return;

      setInfoFunc && setInfoFunc(selected);

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
              setDataFunc(enriched);
            },
          });
        });

      fetch(`/data/${selected.id}_2024_stats.csv`)
        .then((res) => res.text())
        .then((csv) => {
          Papa.parse(csv, {
            header: true,
            complete: (results) =>
              setStatsFunc && setStatsFunc(results.data[0]),
          });
        });
    },
    [players]
  );

  useEffect(() => {
    if (!selectedPlayerId || currentMode !== "dashboard") return;
    loadPlayerData(selectedPlayerId, setData, setPlayerInfo, setStats);
  }, [selectedPlayerId, currentMode, loadPlayerData]);

  useEffect(() => {
    if (currentMode === "comparison" && leftPlayer) {
      loadPlayerData(
        leftPlayer.id,
        setLeftPlayerData,
        null,
        setLeftPlayerStats
      );
    }
  }, [leftPlayer, currentMode, loadPlayerData]);

  useEffect(() => {
    if (currentMode === "comparison" && rightPlayer) {
      loadPlayerData(
        rightPlayer.id,
        setRightPlayerData,
        null,
        setRightPlayerStats
      );
    }
  }, [rightPlayer, currentMode, loadPlayerData]);

  const categorize = (d) => {
    const desc = d.description?.toLowerCase() || "";
    const evt = d.events?.toLowerCase() || "";

    if (evt === "strikeout") return "Strikeout";
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

  const getFilteredComparisonData = (playerData, filterToUse) => {
    return playerData.filter((d) => {
      const desc = d.description?.toLowerCase() || "";
      const matchType =
        filterToUse.type === "All" || d.category === filterToUse.type;
      const matchDetail =
        filterToUse.detail === "All" ||
        (filterToUse.detail === "Called" && desc.includes("called_strike")) ||
        (filterToUse.detail === "Swing" && desc.includes("swinging_strike")) ||
        (filterToUse.detail === "Foul" && desc.includes("foul"));
      const matchPitch =
        filterToUse.pitch === "All" || d.pitch_type === filterToUse.pitch;
      const matchInning =
        filterToUse.inning === "All" ||
        String(d.inning) === String(filterToUse.inning);
      return matchType && matchDetail && matchPitch && matchInning;
    });
  };

  const getMultiViewData = (viewFilter) => {
    return data.filter((d) => {
      const desc = d.description?.toLowerCase() || "";
      const matchType =
        viewFilter.type === "All" || d.category === viewFilter.type;
      const matchDetail =
        viewFilter.detail === "All" ||
        (viewFilter.detail === "Called" && desc.includes("called_strike")) ||
        (viewFilter.detail === "Swing" && desc.includes("swinging_strike")) ||
        (viewFilter.detail === "Foul" && desc.includes("foul"));
      const matchPitch =
        viewFilter.pitch === "All" || d.pitch_type === viewFilter.pitch;
      const matchInning =
        viewFilter.inning === "All" ||
        String(d.inning) === String(viewFilter.inning);
      return matchType && matchDetail && matchPitch && matchInning;
    });
  };

  const pitchTypes = Array.from(new Set(data.map((d) => d.pitch_type))).filter(
    Boolean
  );

  const leftPitchTypes = Array.from(
    new Set(leftPlayerData.map((d) => d.pitch_type))
  ).filter(Boolean);
  const rightPitchTypes = Array.from(
    new Set(rightPlayerData.map((d) => d.pitch_type))
  ).filter(Boolean);

  const pitchTypeNames = {
    FF: "Four-Seam Fastball",
    FT: "Two-Seam Fastball",
    SI: "Sinker",
    SL: "Slider",
    CU: "Curveball",
    CH: "Changeup",
    KC: "Knuckle Curve",
    FS: "Splitter",
    ST: "Sweeper",
    FC: "Cutter",
    FA: "Fastball",
    SV: "Slurve",
    PO: "Pitchout",
  };

  const getPitchTypeName = (type) => {
    return pitchTypeNames[type] || type;
  };

  const BOX_SIZE = multiViewEnabled ? 150 : 300;
  const VIEW_SIZE = multiViewEnabled ? 350 : 700;
  const COMPARISON_BOX_SIZE = 250;
  const COMPARISON_VIEW_SIZE = 500;

  const viewXmin = -1.5,
    viewXmax = 1.5,
    viewZmin = 1.0,
    viewZmax = 4.0;
  const ZONE_XMIN = -0.83,
    ZONE_XMAX = 0.83,
    ZONE_ZMIN = 1.5,
    ZONE_ZMAX = 3.5;

  const getScales = (boxSize) => {
    const scaleX = boxSize / (viewXmax - viewXmin);
    const scaleZ = boxSize / (viewZmax - viewZmin);
    const zoneWidth = (ZONE_XMAX - ZONE_XMIN) * scaleX;
    const zoneHeight = (ZONE_ZMAX - ZONE_ZMIN) * scaleZ;
    const zoneLeft = (ZONE_XMIN - viewXmin) * scaleX;
    const zoneTop = (viewZmax - ZONE_ZMAX) * scaleZ;
    return { scaleX, scaleZ, zoneWidth, zoneHeight, zoneLeft, zoneTop };
  };

  const StrikeZone = ({ boxSize }) => {
    const { zoneWidth, zoneHeight, zoneLeft, zoneTop } = getScales(boxSize);
    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: boxSize,
          height: boxSize,
          transform: "translate(-50%, -50%)",
          zIndex: 10,
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
              backgroundColor: "#94a3b8",
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
              backgroundColor: "#94a3b8",
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
            border: "2px solid #475569",
            boxSizing: "border-box",
          }}
        />
      </div>
    );
  };

  const ScatterPlot = ({ data: plotData, onPitchClick, boxSize }) => {
    const { scaleX, scaleZ } = getScales(boxSize);
    const dotSize =
      boxSize === COMPARISON_BOX_SIZE ? 3 : multiViewEnabled ? 2 : 4;

    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: boxSize,
          height: boxSize,
          transform: "translate(-50%, -50%)",
          zIndex: 20,
        }}
      >
        {plotData.map((d, idx) => {
          const x = (d.plate_x - viewXmin) * scaleX;
          const y = (viewZmax - d.plate_z) * scaleZ;
          const colorMap = {
            Strike: "#ef4444",
            Ball: "#3b82f6",
            Out: "#6b7280",
            Hit: "#10b981",
            Strikeout: "#dc2626",
            Other: "#374151",
          };
          return (
            <div
              key={idx}
              title={`${d.description}\n${d.events || ""}`}
              onClick={() => onPitchClick && onPitchClick(d)}
              style={{
                position: "absolute",
                left: x - dotSize,
                top: y - dotSize,
                width: dotSize * 2,
                height: dotSize * 2,
                borderRadius: "50%",
                backgroundColor: colorMap[d.category] || "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                zIndex: 1,
              }}
            />
          );
        })}
      </div>
    );
  };

  const PlayerInfoCard = ({ player, stats, side }) => (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid #e2e8f0",
        }}
      >
        <img
          src={player.img}
          alt={player.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "20px",
            fontWeight: "700",
            color: "#1e293b",
          }}
        >
          {player.name}
        </h3>
        <p
          style={{
            margin: "0 0 12px 0",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          Pitcher | {player.team}
        </p>

        {stats && (
          <div
            style={{
              display: "flex",
              gap: "16px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {stats.ERA}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>ERA</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {stats.WAR}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>WAR</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {stats.W}-{stats.L}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>W-L</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {stats.IP}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>IP</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!playerInfo && currentMode === "dashboard") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f8fafc",
          color: "#64748b",
          fontSize: "18px",
        }}
      >
        Loading players...
      </div>
    );
  }

  const buttonStyle = {
    padding: "8px 16px",
    margin: "0 4px",
    border: "1px solid #000000",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#475569",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#3b82f6",
    color: "white",
    borderColor: "#3b82f6",
  };

  const selectStyle = {
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    fontSize: "16px",
    fontWeight: "500",
    color: "#1e293b",
    cursor: "pointer",
    width: "100%",
    marginBottom: "24px",
  };

  return (
    <div
      style={{
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "16px 32px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: "700",
            color: "#1e293b",
          }}
        >
          🔹 EveryPitch
        </h1>
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "center",
            color: "#64748b",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <span
            onClick={() => setCurrentMode("dashboard")}
            style={{
              cursor: "pointer",
              color: currentMode === "dashboard" ? "#3b82f6" : "#64748b",
              fontWeight: currentMode === "dashboard" ? "600" : "500",
            }}
          >
            Dashboard
          </span>
          <span
            onClick={() => setCurrentMode("comparison")}
            style={{
              cursor: "pointer",
              color: currentMode === "comparison" ? "#3b82f6" : "#64748b",
              fontWeight: currentMode === "comparison" ? "600" : "500",
            }}
          >
            Comparison
          </span>
          <span
            onClick={() => setIsMembersPopupOpen(true)}
            style={{ cursor: "pointer" }}
          >
            Members
          </span>
        </div>
      </div>

      {currentMode === "dashboard" && (
        <div style={{ display: "flex", padding: "32px", gap: "32px" }}>
          <div
            style={{
              flex: "1",
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                Pitch Analysis
              </h2>

              <button
                onClick={() => setMultiViewEnabled(!multiViewEnabled)}
                style={{
                  ...buttonStyle,
                  ...(multiViewEnabled ? activeButtonStyle : {}),
                  fontSize: "14px",
                  padding: "8px 16px",
                }}
              >
                {multiViewEnabled ? "Single View" : "Multi View"}
              </button>
            </div>

            <div style={{ marginBottom: "32px" }}>
              <select
                value={selectedPlayerId || ""}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={selectStyle}
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {!multiViewEnabled ? (
              <div
                style={{
                  position: "relative",
                  width: VIEW_SIZE,
                  height: VIEW_SIZE,
                  margin: "0 auto",
                  backgroundColor: "white",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <StrikeZone boxSize={BOX_SIZE} />
                <ScatterPlot
                  data={filteredData}
                  onPitchClick={setSelectedPitch}
                  boxSize={BOX_SIZE}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr",
                  gap: "16px",
                  width: "720px",
                  height: "720px",
                  margin: "0 auto",
                }}
              >
                {multiViewFilters.map((viewFilter, index) => (
                  <div
                    key={index}
                    style={{
                      position: "relative",
                      backgroundColor: "white",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      overflow: "hidden",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#475569",
                        zIndex: 30,
                      }}
                    >
                      {viewFilter.label}
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "8px",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        color: "#64748b",
                        zIndex: 30,
                        maxWidth: "calc(100% - 16px)",
                      }}
                    >
                      {viewFilter.type} | {viewFilter.detail} |{" "}
                      {viewFilter.pitch === "All"
                        ? "All Pitches"
                        : getPitchTypeName(viewFilter.pitch)}{" "}
                      | Inning {viewFilter.inning}
                    </div>

                    <StrikeZone boxSize={BOX_SIZE} />
                    <ScatterPlot
                      data={getMultiViewData(viewFilter)}
                      onPitchClick={setSelectedPitch}
                      boxSize={BOX_SIZE}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              width: "320px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Player Profile
              </h3>

              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  overflow: "hidden",
                  border: "4px solid #e2e8f0",
                }}
              >
                <img
                  src={playerInfo.img}
                  alt={playerInfo.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <h2
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1e293b",
                }}
              >
                {playerInfo.name}
              </h2>

              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Pitcher | {playerInfo.team}
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Jersey #{playerInfo.number?.replace("No.", "")} | 2024 Season
              </p>

              {stats && (
                <div
                  style={{
                    marginTop: "24px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {stats.ERA}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      ERA
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {stats.WAR}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      WAR
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {stats.W}-{stats.L}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      W-L
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1e293b",
                      }}
                    >
                      {stats.IP}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      IP
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setIsMultiViewOpen(!isMultiViewOpen)}
                style={{
                  width: "100%",
                  padding: "20px 24px",
                  border: "none",
                  backgroundColor: "white",
                  color: "#1e293b",
                  fontSize: "18px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  outline: "none",
                }}
              >
                MultiView Settings
                <span style={{ fontSize: "14px", color: "#64748b" }}>
                  {isMultiViewOpen ? "−" : "+"}
                </span>
              </button>

              {isMultiViewOpen && (
                <div style={{ padding: "0 24px 24px" }}>
                  {multiViewFilters.map((viewFilter, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: "16px",
                        padding: "16px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 12px 0",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        View {index + 1}
                      </h4>

                      <div style={{ marginBottom: "12px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        >
                          Outcome
                        </label>
                        <select
                          value={viewFilter.type}
                          onChange={(e) => {
                            const newFilters = [...multiViewFilters];
                            newFilters[index].type = e.target.value;
                            setMultiViewFilters(newFilters);
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        >
                          {[
                            "All",
                            "Strike",
                            "Ball",
                            "Out",
                            "Hit",
                            "Strikeout",
                          ].map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        >
                          Detail
                        </label>
                        <select
                          value={viewFilter.detail}
                          onChange={(e) => {
                            const newFilters = [...multiViewFilters];
                            newFilters[index].detail = e.target.value;
                            setMultiViewFilters(newFilters);
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        >
                          {["All", "Called", "Swing", "Foul"].map((detail) => (
                            <option key={detail} value={detail}>
                              {detail}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        >
                          Pitch Type
                        </label>
                        <select
                          value={viewFilter.pitch}
                          onChange={(e) => {
                            const newFilters = [...multiViewFilters];
                            newFilters[index].pitch = e.target.value;
                            setMultiViewFilters(newFilters);
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        >
                          <option value="All">All Pitches</option>
                          {pitchTypes.map((type) => (
                            <option key={type} value={type}>
                              {getPitchTypeName(type)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#64748b",
                            marginBottom: "4px",
                          }}
                        >
                          Inning
                        </label>
                        <select
                          value={viewFilter.inning}
                          onChange={(e) => {
                            const newFilters = [...multiViewFilters];
                            newFilters[index].inning = e.target.value;
                            setMultiViewFilters(newFilters);
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        >
                          <option value="All">All Innings</option>
                          {[...Array(9)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Inning {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!multiViewEnabled && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Outcome Filters
                </h3>
                <div style={{ marginBottom: "16px" }}>
                  {["All", "Strike", "Ball", "Out", "Hit", "Strikeout"].map(
                    (label) => (
                      <button
                        key={label}
                        onClick={() =>
                          setFilter((f) => ({ ...f, type: label }))
                        }
                        style={{
                          ...buttonStyle,
                          ...(filter.type === label ? activeButtonStyle : {}),
                          fontSize: "12px",
                          padding: "6px 12px",
                          margin: "2px",
                        }}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  {["All", "Called", "Swing", "Foul"].map((detail) => (
                    <button
                      key={detail}
                      onClick={() => setFilter((f) => ({ ...f, detail }))}
                      style={{
                        ...buttonStyle,
                        ...(filter.detail === detail ? activeButtonStyle : {}),
                        fontSize: "12px",
                        padding: "6px 12px",
                        margin: "2px",
                      }}
                    >
                      {detail}
                    </button>
                  ))}
                </div>

                <select
                  value={filter.inning}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, inning: e.target.value }))
                  }
                  style={{
                    ...buttonStyle,
                    fontSize: "12px",
                    padding: "6px 12px",
                    width: "100%",
                    outline: "none",
                  }}
                >
                  <option value="All">All Innings</option>
                  {[...Array(9)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Inning {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!multiViewEnabled && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Pitch Filters
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {["All", ...pitchTypes].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilter((f) => ({ ...f, pitch: type }))}
                      style={{
                        ...buttonStyle,
                        ...(filter.pitch === type ? activeButtonStyle : {}),
                        fontSize: "12px",
                        padding: "6px 12px",
                      }}
                    >
                      {type === "All" ? "All" : getPitchTypeName(type)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedPitch && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Pitch Details
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    fontSize: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Date</span>
                    <span style={{ fontWeight: "500", color: "#1e293b" }}>
                      {selectedPitch.game_date}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Batter ID</span>
                    <span style={{ fontWeight: "500", color: "#1e293b" }}>
                      {selectedPitch.batter}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Pitch Info</span>
                    <span style={{ fontWeight: "500", color: "#1e293b" }}>
                      {selectedPitch.release_speed} mph
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Description</span>
                    <span style={{ fontWeight: "500", color: "#1e293b" }}>
                      {selectedPitch.description}
                    </span>
                  </div>
                  {selectedPitch.events && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#64748b" }}>Event</span>
                      <span style={{ fontWeight: "500", color: "#1e293b" }}>
                        {selectedPitch.events}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentMode === "comparison" && (
        <div style={{ padding: "32px" }}>
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "32px",
            }}
          >
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Player A
              </h3>
              <select
                value={leftPlayer?.id || ""}
                onChange={(e) => {
                  const selected = players.find((p) => p.id === e.target.value);
                  setLeftPlayer(selected);
                }}
                style={selectStyle}
              >
                <option value="">Select Player A</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Player B
              </h3>
              <select
                value={rightPlayer?.id || ""}
                onChange={(e) => {
                  const selected = players.find((p) => p.id === e.target.value);
                  setRightPlayer(selected);
                }}
                style={selectStyle}
              >
                <option value="">Select Player B</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "32px",
            }}
          >
            <div style={{ flex: 1 }}>
              {leftPlayer && (
                <PlayerInfoCard
                  player={leftPlayer}
                  stats={leftPlayerStats}
                  side="left"
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              {rightPlayer && (
                <PlayerInfoCard
                  player={rightPlayer}
                  stats={rightPlayerStats}
                  side="right"
                />
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "32px",
            }}
          >
            <div style={{ flex: 1 }}>
              {leftPlayer && (
                <div
                  style={{
                    position: "relative",
                    width: COMPARISON_VIEW_SIZE,
                    height: COMPARISON_VIEW_SIZE,
                    margin: "0 auto",
                    backgroundColor: "white",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "16px",
                      backgroundColor: "rgba(255,255,255,0.9)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                      zIndex: 30,
                    }}
                  >
                    {leftPlayer.name}
                  </div>
                  <StrikeZone boxSize={COMPARISON_BOX_SIZE} />
                  <ScatterPlot
                    data={getFilteredComparisonData(leftPlayerData, leftFilter)}
                    onPitchClick={setSelectedPitch}
                    boxSize={COMPARISON_BOX_SIZE}
                  />
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              {rightPlayer && (
                <div
                  style={{
                    position: "relative",
                    width: COMPARISON_VIEW_SIZE,
                    height: COMPARISON_VIEW_SIZE,
                    margin: "0 auto",
                    backgroundColor: "white",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "16px",
                      backgroundColor: "rgba(255,255,255,0.9)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                      zIndex: 30,
                    }}
                  >
                    {rightPlayer.name}
                  </div>
                  <StrikeZone boxSize={COMPARISON_BOX_SIZE} />
                  <ScatterPlot
                    data={getFilteredComparisonData(
                      rightPlayerData,
                      rightFilter
                    )}
                    onPitchClick={setSelectedPitch}
                    boxSize={COMPARISON_BOX_SIZE}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "32px",
            }}
          >
            <div
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1e293b",
                  textAlign: "center",
                }}
              >
                {leftPlayer ? `${leftPlayer.name} Filters` : "Player A Filters"}
              </h3>

              <div style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Outcome
                </h4>
                <div style={{ marginBottom: "12px" }}>
                  {["All", "Strike", "Ball", "Out", "Hit", "Strikeout"].map(
                    (label) => (
                      <button
                        key={label}
                        onClick={() =>
                          setLeftFilter((f) => ({ ...f, type: label }))
                        }
                        style={{
                          ...buttonStyle,
                          ...(leftFilter.type === label
                            ? activeButtonStyle
                            : {}),
                          fontSize: "11px",
                          padding: "4px 8px",
                          margin: "1px",
                        }}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>

                <div style={{ marginBottom: "12px" }}>
                  {["All", "Called", "Swing", "Foul"].map((detail) => (
                    <button
                      key={detail}
                      onClick={() => setLeftFilter((f) => ({ ...f, detail }))}
                      style={{
                        ...buttonStyle,
                        ...(leftFilter.detail === detail
                          ? activeButtonStyle
                          : {}),
                        fontSize: "11px",
                        padding: "4px 8px",
                        margin: "1px",
                      }}
                    >
                      {detail}
                    </button>
                  ))}
                </div>

                <select
                  value={leftFilter.inning}
                  onChange={(e) =>
                    setLeftFilter((f) => ({ ...f, inning: e.target.value }))
                  }
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 8px",
                    width: "100%",
                    outline: "none",
                  }}
                >
                  <option value="All">All Innings</option>
                  {[...Array(9)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Inning {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Pitch Type
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  {["All", ...leftPitchTypes].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setLeftFilter((f) => ({ ...f, pitch: type }))
                      }
                      style={{
                        ...buttonStyle,
                        ...(leftFilter.pitch === type ? activeButtonStyle : {}),
                        fontSize: "10px",
                        padding: "4px 6px",
                      }}
                    >
                      {type === "All" ? "All" : getPitchTypeName(type)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1e293b",
                  textAlign: "center",
                }}
              >
                {rightPlayer
                  ? `${rightPlayer.name} Filters`
                  : "Player B Filters"}
              </h3>

              <div style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Outcome
                </h4>
                <div style={{ marginBottom: "12px" }}>
                  {["All", "Strike", "Ball", "Out", "Hit", "Strikeout"].map(
                    (label) => (
                      <button
                        key={label}
                        onClick={() =>
                          setRightFilter((f) => ({ ...f, type: label }))
                        }
                        style={{
                          ...buttonStyle,
                          ...(rightFilter.type === label
                            ? activeButtonStyle
                            : {}),
                          fontSize: "11px",
                          padding: "4px 8px",
                          margin: "1px",
                        }}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>

                <div style={{ marginBottom: "12px" }}>
                  {["All", "Called", "Swing", "Foul"].map((detail) => (
                    <button
                      key={detail}
                      onClick={() => setRightFilter((f) => ({ ...f, detail }))}
                      style={{
                        ...buttonStyle,
                        ...(rightFilter.detail === detail
                          ? activeButtonStyle
                          : {}),
                        fontSize: "11px",
                        padding: "4px 8px",
                        margin: "1px",
                      }}
                    >
                      {detail}
                    </button>
                  ))}
                </div>

                <select
                  value={rightFilter.inning}
                  onChange={(e) =>
                    setRightFilter((f) => ({ ...f, inning: e.target.value }))
                  }
                  style={{
                    ...buttonStyle,
                    fontSize: "11px",
                    padding: "4px 8px",
                    width: "100%",
                    outline: "none",
                  }}
                >
                  <option value="All">All Innings</option>
                  {[...Array(9)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Inning {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e293b",
                  }}
                >
                  Pitch Type
                </h4>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  {["All", ...rightPitchTypes].map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setRightFilter((f) => ({ ...f, pitch: type }))
                      }
                      style={{
                        ...buttonStyle,
                        ...(rightFilter.pitch === type
                          ? activeButtonStyle
                          : {}),
                        fontSize: "10px",
                        padding: "4px 6px",
                      }}
                    >
                      {type === "All" ? "All" : getPitchTypeName(type)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {selectedPitch && (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                marginTop: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                Pitch Details
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Date</span>
                  <span style={{ fontWeight: "500", color: "#1e293b" }}>
                    {selectedPitch.game_date}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Batter ID</span>
                  <span style={{ fontWeight: "500", color: "#1e293b" }}>
                    {selectedPitch.batter}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Pitch Info</span>
                  <span style={{ fontWeight: "500", color: "#1e293b" }}>
                    {selectedPitch.release_speed} mph
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Description</span>
                  <span style={{ fontWeight: "500", color: "#1e293b" }}>
                    {selectedPitch.description}
                  </span>
                </div>
                {selectedPitch.events && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Event</span>
                    <span style={{ fontWeight: "500", color: "#1e293b" }}>
                      {selectedPitch.events}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isMembersPopupOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setIsMembersPopupOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80%",
              overflow: "auto",
              boxShadow: "0 20px 25px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 24px 0",
                fontSize: "24px",
                fontWeight: "700",
              }}
            >
              Team Members
            </h2>

            <p>[CAS4150] Data Visualization Class Project</p>
            <p>Team 10</p>
            <button
              onClick={() => setIsMembersPopupOpen(false)}
              style={{
                marginTop: "24px",
                padding: "8px 16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
