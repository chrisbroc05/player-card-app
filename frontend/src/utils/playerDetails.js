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
  if (!position.trim()) errors.position = "Position is required";
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
