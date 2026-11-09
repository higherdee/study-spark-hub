import { turso } from "@/integrations/turso/client.server";
import { ensurePromoTables, promoBenefits } from "@/lib/membership/promos.server";
import { bestSubscription, ensureBillingTables, saveSubscription, claimBillingOperation, releaseBillingOperation } from "./store.server";
import { extendBachsFirstRenewal } from "./bachs.server";
import { firstRenewalDate, type BillingEnvironment, type PlanId } from "./catalog";

// A verified checkout can add time once, even when a webhook is retried.
export async function grantPrepaidTime(userId:string,checkoutId:string,plan:PlanId,environment:BillingEnvironment,paidAt:string) {
  await ensurePromoTables();await ensureBillingTables();
  const tx=await turso.transaction("write");
  try {
    const key=`prepaid:${checkoutId}`;
    const existing=(await tx.execute({sql:"SELECT expires_at FROM membership_promo_claims WHERE user_id=? AND request_id=?",args:[userId,key]})).rows[0];
    if(existing){await tx.commit();return String(existing["expires_at"])}
    const row=(await tx.execute({sql:"SELECT MAX(until) AS until FROM (SELECT MAX(expires_at) AS until FROM membership_promo_claims WHERE user_id=? AND effect='plus_days' UNION ALL SELECT MAX(period_end) AS until FROM billing_subscriptions WHERE user_id=? AND environment=? AND status IN ('active','trialing'))",args:[userId,userId,environment]})).rows[0];
    const base=new Date(Math.max(Date.parse(paidAt),Date.parse(String(row?.["until"]))||0)).toISOString();
    const until=firstRenewalDate(base,plan,0);
    const days=Math.round((Date.parse(until)-Date.parse(base))/86400000);
    // Sandbox receipts stay isolated and never grant live access.
    if(environment==="live") await tx.execute({sql:"INSERT INTO membership_promo_claims VALUES(?,?,?,?,?,?,?,?,?)",args:[key,key,userId,1,"plus_days",days,paidAt,until,key]});
    await tx.execute({sql:"UPDATE billing_checkouts SET state='paid' WHERE id=? AND user_id=? AND environment=?",args:[checkoutId,userId,environment]});
    await tx.commit();return until;
  }catch(error){await tx.rollback();throw error}finally{tx.close()}
}

export async function alignPrepaidRenewal(userId:string) {
  const scope=`prepaid-renewal:${userId}`;const lease=await claimBillingOperation(scope);if(!lease)return;
  try {
  const [benefits,sub]=await Promise.all([promoBenefits(userId),bestSubscription(userId,"live")]);
  const target=benefits.plusUntil;
  if(!target||!sub||sub.provider!=="bachs"||sub.providerId.startsWith("pass_")||sub.cancelAt||!["active","trialing"].includes(sub.status)||!sub.periodEnd||Date.parse(target)<=Date.parse(sub.periodEnd))return;
  const canonical=await extendBachsFirstRenewal(sub.providerId,target,"live");
  const confirmed=canonical.trial_end?new Date(canonical.trial_end).toISOString():null;
  if(confirmed!==target)throw new Error("Your access is extended; the automatic renewal date is still being synchronized.");
  await saveSubscription({...sub,status:"trialing",periodEnd:target,occurredAt:new Date().toISOString()});
  }finally{await releaseBillingOperation(scope,lease)}
}
