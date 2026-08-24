import React, { useState } from "react";

export default function IndiaMap({ onSelectCategory }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  // Category Nodes positioned accurately relative to the map canvas
  const categoryNodes = [
    {
      id: "education",
      name: "Education & Scholarships",
      icon: "🎓",
      color: "#8B5CF6", // purple
      bg: "rgba(139, 92, 246, 0.25)",
      border: "#A78BFA",
      x: 340,
      y: 190,
      count: "350+ Schemes",
    },
    {
      id: "health",
      name: "Health & Ayushman",
      icon: "❤️",
      color: "#EF4444", // red/pink
      bg: "rgba(239, 68, 68, 0.25)",
      border: "#F87171",
      x: 215,
      y: 280,
      count: "180+ Schemes",
    },
    {
      id: "housing",
      name: "Housing & PM Awas",
      icon: "🏠",
      color: "#10B981", // green
      bg: "rgba(16, 185, 129, 0.25)",
      border: "#34D399",
      x: 485,
      y: 290,
      count: "120+ Schemes",
    },
    {
      id: "agriculture",
      name: "Agriculture & Farmers",
      icon: "🚜",
      color: "#F59E0B", // amber/gold
      bg: "rgba(245, 158, 11, 0.25)",
      border: "#FBBF24",
      x: 470,
      y: 380,
      count: "240+ Schemes",
    },
    {
      id: "welfare",
      name: "Social Welfare & Women",
      icon: "👥",
      color: "#6366F1", // indigo
      bg: "rgba(99, 102, 241, 0.25)",
      border: "#818CF8",
      x: 320,
      y: 435,
      count: "310+ Schemes",
    },
  ];

  // Key city constellation coordinate points
  const constellationPoints = [
    { name: "Srinagar", x: 260, y: 110 },
    { name: "Shimla", x: 280, y: 145 },
    { name: "Delhi", x: 300, y: 210 },
    { name: "Jaipur", x: 250, y: 240 },
    { name: "Lucknow", x: 360, y: 235 },
    { name: "Patna", x: 420, y: 250 },
    { name: "Guwahati", x: 520, y: 230 },
    { name: "Ahmedabad", x: 200, y: 310 },
    { name: "Bhopal", x: 310, y: 315 },
    { name: "Ranchi", x: 425, y: 300 },
    { name: "Kolkata", x: 460, y: 320 },
    { name: "Mumbai", x: 220, y: 400 },
    { name: "Pune", x: 235, y: 420 },
    { name: "Hyderabad", x: 320, y: 420 },
    { name: "Bhubaneswar", x: 430, y: 375 },
    { name: "Bengaluru", x: 290, y: 495 },
    { name: "Chennai", x: 345, y: 490 },
    { name: "Kochi", x: 280, y: 550 },
    { name: "Thiruvananthapuram", x: 290, y: 580 },
  ];

  // Connections between constellation points
  const networkLines = [
    [0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6],
    [3, 7], [2, 8], [8, 9], [9, 10], [5, 9],
    [7, 11], [11, 12], [8, 13], [9, 14], [10, 14],
    [12, 15], [13, 15], [13, 16], [14, 16],
    [15, 17], [16, 17], [17, 18], [15, 18]
  ];

  return (
    <div className="india-map-container" aria-label="Interactive India Map of Government Schemes">
      <svg
        viewBox="0 0 640 640"
        className="india-map-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon Grid Pattern */}
          <pattern id="grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.75" />
          </pattern>

          {/* Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow-monument" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial Map Gradients */}
          <radialGradient id="map-bg-radial" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="rgba(14, 165, 233, 0.14)" />
            <stop offset="60%" stopColor="rgba(14, 165, 233, 0.04)" />
            <stop offset="100%" stopColor="rgba(14, 165, 233, 0)" />
          </radialGradient>

          <linearGradient id="india-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Background Radar Grid Circles */}
        <circle cx="310" cy="330" r="280" stroke="rgba(56, 189, 248, 0.04)" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="310" cy="330" r="210" stroke="rgba(56, 189, 248, 0.06)" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="310" cy="330" r="140" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
        <circle cx="310" cy="330" r="70" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" />

        {/* Ambient Map Glow */}
        <circle cx="310" cy="320" r="240" fill="url(#map-bg-radial)" />

        {/* Accurate India Silhouette Vector Path */}
        <g className="india-boundary-group">
          {/* Subtle Outer Glow Silhouette */}
          <path
            d="M260 70 
               C265 65, 275 60, 285 70 
               C295 80, 285 105, 305 115 
               C325 125, 335 120, 350 140 
               C365 160, 345 185, 365 195 
               C385 205, 410 195, 435 210 
               C460 225, 490 205, 520 200 
               C550 195, 575 220, 565 240 
               C555 260, 525 255, 505 270 
               C485 285, 475 305, 470 325 
               C465 345, 470 370, 455 390 
               C440 410, 420 425, 400 450 
               C380 475, 365 510, 345 545 
               C325 580, 305 605, 290 600 
               C275 595, 270 560, 265 530 
               C260 500, 245 470, 235 440 
               C225 410, 205 385, 195 360 
               C185 335, 160 320, 155 295 
               C150 270, 175 250, 190 230 
               C205 210, 215 190, 230 170 
               C245 150, 240 120, 245 95 
               Z"
            fill="rgba(14, 165, 233, 0.03)"
            stroke="url(#india-border-gradient)"
            strokeWidth="1.75"
            filter="url(#glow-cyan)"
            className="india-main-border"
          />

          {/* Internal Cyber Grid Mesh Lines */}
          <path
            d="M260 70 L300 210 L310 330 L290 600 M155 295 L310 330 L520 200 M195 360 L320 420 L470 325 M230 170 L360 235 L505 270 M235 440 L345 490 L400 450"
            stroke="rgba(56, 189, 248, 0.12)"
            strokeWidth="0.8"
            strokeDasharray="2 3"
          />
        </g>

        {/* Constellation Network Connections */}
        <g className="constellation-network">
          {networkLines.map(([fromIdx, toIdx], i) => {
            const p1 = constellationPoints[fromIdx];
            const p2 = constellationPoints[toIdx];
            return (
              <line
                key={`line-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(56, 189, 248, 0.28)"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="constellation-laser-line"
              />
            );
          })}

          {/* Shimmering Node Dots */}
          {constellationPoints.map((pt, i) => (
            <g key={`pt-${i}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="2.5"
                fill="#38BDF8"
                className="constellation-dot"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="6"
                fill="none"
                stroke="rgba(56, 189, 248, 0.4)"
                strokeWidth="0.75"
                className="constellation-ring"
              />
            </g>
          ))}
        </g>

        {/* Central Monument: Parliament / Rashtrapati Bhavan with Indian Flag */}
        <g className="central-monument" transform="translate(230, 245)" filter="url(#glow-monument)">
          {/* Base Platform & Steps */}
          <rect x="0" y="80" width="160" height="8" rx="2" fill="#1E293B" stroke="#38BDF8" strokeWidth="1" />
          <rect x="10" y="74" width="140" height="6" rx="1" fill="#1E293B" stroke="#38BDF8" strokeWidth="0.8" />
          <rect x="20" y="68" width="120" height="6" rx="1" fill="#1E293B" stroke="#38BDF8" strokeWidth="0.8" />

          {/* Main Facade & Classical Columns */}
          <rect x="25" y="44" width="110" height="24" rx="2" fill="rgba(15, 23, 42, 0.85)" stroke="#38BDF8" strokeWidth="1" />
          
          {/* Columns */}
          {[32, 44, 56, 68, 80, 92, 104, 116, 128].map((colX, idx) => (
            <line
              key={`col-${idx}`}
              x1={colX}
              y1="44"
              x2={colX}
              y2="68"
              stroke="#60A5FA"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}

          {/* Arch Entrances */}
          <path d="M72 68 L72 52 Q80 46 88 52 L88 68 Z" fill="rgba(56, 189, 248, 0.25)" stroke="#38BDF8" strokeWidth="0.75" />
          <path d="M52 68 L52 56 Q58 51 64 56 L64 68 Z" fill="rgba(56, 189, 248, 0.15)" stroke="#38BDF8" strokeWidth="0.75" />
          <path d="M96 68 L96 56 Q102 51 108 56 L108 68 Z" fill="rgba(56, 189, 248, 0.15)" stroke="#38BDF8" strokeWidth="0.75" />

          {/* Pediment / Upper Balcony */}
          <rect x="35" y="38" width="90" height="6" rx="1" fill="#1E293B" stroke="#38BDF8" strokeWidth="0.8" />

          {/* Great Dome */}
          <path
            d="M55 38 C55 18, 105 18, 105 38 Z"
            fill="rgba(15, 23, 42, 0.95)"
            stroke="#38BDF8"
            strokeWidth="1.2"
          />
          {/* Dome Ribs */}
          <path d="M80 18 L80 38" stroke="#38BDF8" strokeWidth="0.75" />
          <path d="M68 22 Q75 30 75 38" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="0.6" />
          <path d="M92 22 Q85 30 85 38" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="0.6" />

          {/* Dome Finial & Flag Mast */}
          <rect x="79" y="12" width="2" height="7" fill="#FBBF24" />
          <line x1="80" y1="12" x2="80" y2="-16" stroke="#E2E8F0" strokeWidth="1.5" />

          {/* Fluttering Indian Tricolor Flag */}
          <g className="indian-flag-flutter" transform="translate(80, -16)">
            {/* Saffron Band */}
            <path d="M0 0 C6 -1, 14 2, 22 0 L22 4 C14 6, 6 3, 0 4 Z" fill="#FF9933" />
            {/* White Band */}
            <path d="M0 4 C6 3, 14 6, 22 4 L22 8 C14 10, 6 7, 0 8 Z" fill="#FFFFFF" />
            {/* Ashoka Chakra */}
            <circle cx="11" cy="6" r="1.5" fill="none" stroke="#000088" strokeWidth="0.4" />
            {/* Green Band */}
            <path d="M0 8 C6 7, 14 10, 22 8 L22 12 C14 14, 6 11, 0 12 Z" fill="#138808" />
          </g>
        </g>

        {/* Laser Beams connecting Monument to Floating Categories */}
        <g className="monument-beams">
          {categoryNodes.map((node) => (
            <line
              key={`beam-${node.id}`}
              x1="310"
              y1="280"
              x2={node.x}
              y2={node.y}
              stroke={node.color}
              strokeWidth="1"
              strokeOpacity="0.4"
              strokeDasharray="4 4"
              className="radar-beam-pulse"
            />
          ))}
        </g>
      </svg>

      {/* Floating Interactive Scheme Category Badges */}
      <div className="category-pins-layer">
        {categoryNodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          return (
            <div
              key={node.id}
              className={`category-pin-node ${node.id} ${isHovered ? "active" : ""}`}
              style={{
                left: `${(node.x / 640) * 100}%`,
                top: `${(node.y / 640) * 100}%`,
                "--node-color": node.color,
                "--node-bg": node.bg,
                "--node-border": node.border,
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => onSelectCategory && onSelectCategory(node.id)}
              role="button"
              tabIndex={0}
            >
              {/* Radar Wave Rings */}
              <div className="pin-radar-ring ring-1"></div>
              <div className="pin-radar-ring ring-2"></div>

              {/* Main Badge Icon */}
              <div className="pin-icon-bubble">
                <span className="pin-emoji">{node.icon}</span>
              </div>

              {/* Tooltip on Hover */}
              <div className="pin-tooltip">
                <span className="tooltip-title">{node.name}</span>
                <span className="tooltip-count">{node.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
