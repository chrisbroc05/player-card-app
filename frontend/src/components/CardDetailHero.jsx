/** Full-size card container for detail pages — max width with viewport padding. */
export default function CardDetailHero({ children, className = "" }) {
  return <div className={`card-detail-hero ${className}`.trim()}>{children}</div>;
}
