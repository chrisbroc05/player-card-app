import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../../utils/marketplace";

function BalanceItem({ label, amount }) {
  return (
    <div className="profile-balance-card__item">
      <p className="profile-balance-card__label">{label}</p>
      <p className="profile-balance-card__amount">{formatMoney(amount ?? 0)}</p>
    </div>
  );
}

export default function ProfileBalanceCard({
  marketplaceBalance = 0,
  marketplaceEarnings = 0,
  totalWithdrawn = 0,
  loading = false,
}) {
  return (
    <section className="profile-balance-card" aria-label="Account balances">
      <div className="profile-balance-card__grid">
        <BalanceItem label="Marketplace Balance" amount={marketplaceBalance} />
        <BalanceItem label="Marketplace Earnings" amount={marketplaceEarnings} />
        <BalanceItem label="Total Withdrawn" amount={totalWithdrawn} />
      </div>
      <div className="profile-balance-card__actions">
        <Link to="/credits#withdraw" className="profile-balance-card__btn profile-balance-card__btn--outline">
          Withdraw Earnings
        </Link>
        <Link to="/credits" className="profile-balance-card__btn profile-balance-card__btn--primary">
          Load Funds
        </Link>
      </div>
      {loading ? <p className="profile-balance-card__loading">Updating balances…</p> : null}
    </section>
  );
}
