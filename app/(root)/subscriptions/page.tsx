import { PricingTable } from "@clerk/nextjs";
import { getCurrentPlanLimits } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const pricingTableAppearance = {
    variables: {
        colorPrimary: "#663820",
        colorPrimaryForeground: "#ffffff",
        colorBackground: "#ffffff",
        colorForeground: "#212a3b",
        colorMutedForeground: "#3d485e",
        colorNeutral: "#212a3b",
        borderRadius: "0.625rem",
        fontFamily: "var(--font-mona-sans)",
    },
    elements: {
        pricingTable: "pricing-table",
        pricingTableCard: "pricing-table-card",
        pricingTableCardHeader: "pricing-table-card-header",
        pricingTableCardTitle: "pricing-table-card-title",
        pricingTableCardBadge: "pricing-table-card-badge",
        pricingTableCardFee: "pricing-table-card-fee",
        pricingTableCardBody: "pricing-table-card-body",
        pricingTableCardFeaturesListItem: "pricing-table-card-feature",
        pricingTableCardFeaturesListItemTitle: "pricing-table-card-feature-title",
        pricingTableCardFooter: "pricing-table-card-footer",
        pricingTableCardFooterButton: "pricing-table-card-footer-btn",
    },
};

const SubscriptionsPage = async () => {
    const { limits } = await getCurrentPlanLimits();

    return (
        <main className="clerk-subscriptions">
            <h1 className="page-title">Choose Your Plan</h1>
            <p className="page-description">
                Upgrade anytime to unlock more books, sessions, and longer conversations.
            </p>
            <span className="plan-current-badge">
                Current plan: {limits.planName}
            </span>
            <div className="pricing-table-wrapper">
                <PricingTable
                    appearance={pricingTableAppearance}
                    newSubscriptionRedirectUrl="/subscriptions"
                />
            </div>
        </main>
    );
};

export default SubscriptionsPage;
