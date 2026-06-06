/** True when the signed-in user owns the card record. */
export function isCardOwner(card, user) {
  if (!card || user?.id == null || card.owner_id == null) return false;
  return Number(user.id) === Number(card.owner_id);
}
