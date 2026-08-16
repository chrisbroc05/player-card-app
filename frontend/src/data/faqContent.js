/** FAQ content for the Help Center — searched client-side on /help */

export const FAQ_SECTIONS = [
  {
    id: "getting-started",
    label: "Getting Started",
    items: [
      {
        id: "first-card",
        question: "How do I create my first card?",
        answer:
          "Go to the Studio tab, upload a photo of your player, fill in their details, choose a tier and theme, then click Generate. Your first preview is free!",
      },
      {
        id: "tier-difference",
        question: "What is the difference between tiers?",
        answer:
          "Rookie ($2) is our entry level card with green styling. All-Star ($4) has blue premium styling. Legends ($6) is our top tier with gold effects. All tiers use the same AI generation quality — the tier affects the visual style and rarity.",
      },
      {
        id: "credits",
        question: "How do credits work?",
        answer:
          "Credits are the currency used on Prospect Legends. You load credits to your account using a credit card, then spend them on card creation, marketplace purchases, and upgrades. Minimum load is $10.",
      },
    ],
  },
  {
    id: "cards-creation",
    label: "Cards & Creation",
    items: [
      {
        id: "animated-card",
        question: "What is an animated card?",
        answer:
          "Animated cards ($10 upgrade) use AI to bring your player photo to life with a cinematic sports motion. Choose from pitching, hitting, fielding, celebrating and more.",
      },
      {
        id: "highlight-card",
        question: "What is a highlight card?",
        answer:
          "Highlight cards ($5 upgrade) let you upload a real video clip of your player — up to 10 seconds — that plays directly on the card.",
      },
      {
        id: "multiple-players",
        question: "Can I make cards for multiple players?",
        answer:
          "Yes! Each card creation is independent. You can make cards for different players by uploading different photos and entering different player details each time.",
      },
      {
        id: "photo-different",
        question: "Why does my card look different from the photo I uploaded?",
        answer:
          "Our AI generates artistic card imagery inspired by your photo. For the most accurate likeness, upload a clear front-facing face photo in addition to your action shot during card creation.",
      },
      {
        id: "delete-card",
        question: "Can I delete a card?",
        answer:
          "Yes — deleted cards go to Recently Deleted in your collection and can be recovered within 30 days before being permanently deleted.",
      },
    ],
  },
  {
    id: "marketplace-trading",
    label: "Marketplace & Trading",
    items: [
      {
        id: "sell-card",
        question: "How do I sell a card?",
        answer:
          "Go to My Collection, click on a card, and select List on Marketplace. Set your asking price and it goes live immediately.",
      },
      {
        id: "platform-fees",
        question: "What fees does Prospect Legends charge?",
        answer:
          "We charge an 8% platform fee on marketplace sales. So if you sell a card for $10, you receive $9.20 and Prospect Legends keeps $0.80.",
      },
      {
        id: "get-paid",
        question: "How do I get paid when I sell a card?",
        answer:
          "Earnings are added to your credit balance. You can withdraw your balance to your bank account from your Profile page after connecting a bank account through our secure payment partner Stripe.",
      },
      {
        id: "withdrawal-time",
        question: "How long does withdrawal take?",
        answer: "Bank transfers typically take 2-3 business days after initiating a withdrawal.",
      },
      {
        id: "trade-cards",
        question: "Can I trade cards with other users?",
        answer:
          "Yes! You can send free card trades to any user. Go to the Trades tab to initiate a trade offer.",
      },
    ],
  },
  {
    id: "payments-credits",
    label: "Payments & Credits",
    items: [
      {
        id: "payment-secure",
        question: "Is my payment information secure?",
        answer:
          "Yes. All payments are processed by Stripe, a leading payment processor used by millions of businesses worldwide. We never store your card details.",
      },
      {
        id: "refund-credits",
        question: "Can I get a refund on credits?",
        answer:
          "Credits are generally non-refundable once used. If you experience a technical issue that resulted in lost credits, please contact our support team.",
      },
      {
        id: "animation-refund",
        question: "What happens to my credits if an animation fails?",
        answer:
          "If your animated card generation fails for any technical reason, your $10 animation fee is automatically refunded to your credit balance.",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        id: "change-username",
        question: "How do I change my username?",
        answer: "Go to Settings → Account → Display Name.",
      },
      {
        id: "invite-friends",
        question: "How do I invite friends?",
        answer:
          "Share the invite code PROSPECTLEGENDS2026 with friends. They can use it when signing up to join the beta.",
      },
      {
        id: "mobile-app",
        question: "Is there a mobile app?",
        answer:
          "Prospect Legends is a web app that works great on mobile browsers. Open it in Safari on iPhone or Chrome on Android for the best experience. A dedicated app is coming soon!",
      },
    ],
  },
];
