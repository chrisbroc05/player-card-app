export const POSITION_OPTIONS = [
  { value: "P", label: "Pitcher (P)" },
  { value: "C", label: "Catcher (C)" },
  { value: "1B", label: "First Base (1B)" },
  { value: "2B", label: "Second Base (2B)" },
  { value: "3B", label: "Third Base (3B)" },
  { value: "SS", label: "Shortstop (SS)" },
  { value: "LF", label: "Left Field (LF)" },
  { value: "CF", label: "Center Field (CF)" },
  { value: "RF", label: "Right Field (RF)" },
  { value: "DH", label: "Designated Hitter (DH)" },
  { value: "UTIL", label: "Utility (UTIL)" },
  { value: "OF", label: "Outfield (OF)" },
];

const VALID_POSITIONS = new Set(POSITION_OPTIONS.map((o) => o.value));

export function playerNameFromForm(firstName, lastName, displayName) {
  return (displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim());
}

function isValidGradYear(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1950 && n <= 2100;
}

export function validatePlayerDetails(
  firstName,
  lastName,
  displayName,
  teamName,
  position,
  jerseyNumber,
  gradYear
) {
  const errors = {};
  const playerName = playerNameFromForm(firstName, lastName, displayName);
  if (playerName.length < 2) {
    errors.playerName = "Player name is required (minimum 2 characters)";
  }
  if (!teamName.trim()) errors.teamName = "Team name is required";
  if (!position.trim()) {
    errors.position = "Position is required";
  } else if (!VALID_POSITIONS.has(position.trim())) {
    errors.position = "Select a valid position";
  }
  if (!jerseyNumber.trim()) {
    errors.jerseyNumber = "Jersey number is required";
  } else if (!/^\d+$/.test(jerseyNumber.trim())) {
    errors.jerseyNumber = "Jersey number must be a number";
  }
  if (!String(gradYear || "").trim()) {
    errors.gradYear = "Grad year is required";
  } else if (!isValidGradYear(gradYear)) {
    errors.gradYear = "Enter a valid graduation year";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
