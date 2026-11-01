import fs from "node:fs";
import {Paddle,Environment,LogLevel} from "@paddle/paddle-node-sdk";
process.loadEnvFile(".env.local");
const envFile=".env.local";
function save(name,value){if(!value||typeof value!=="string")throw new Error(`No ${name} was returned.`);let text=fs.readFileSync(envFile,"utf8");const line=`${name}=${JSON.stringify(value)}`;const matcher=new RegExp(`^${name}=.*$`,"m");text=matcher.test(text)?text.replace(matcher,()=>line):`${text.trimEnd()}\n${line}\n`;fs.writeFileSync(envFile,text);process.env[name]=value;}
const paddle=new Paddle(process.env.PADDLE_SANDBOX_API_KEY,{environment:Environment.sandbox,logLevel:LogLevel.error});
const paddleUrl="https://syllaboss.org/api/billing-webhook?provider=paddle&environment=sandbox";
const destinations=await paddle.notificationSettings.list();
let destination=destinations.find(item=>item.destination===paddleUrl);
if(!destination)destination=await paddle.notificationSettings.create({description:"Syllaboss sandbox membership",type:"url",destination:paddleUrl,subscribedEvents:["subscription.created","subscription.activated","subscription.updated","subscription.canceled","subscription.past_due","subscription.paused","subscription.resumed","subscription.trialing","transaction.completed","transaction.payment_failed"],trafficSource:"all"});
save("PADDLE_SANDBOX_WEBHOOK_SECRET",destination.endpointSecretKey);
console.log(JSON.stringify({provider:"paddle",configured:true,id:destination.id}));
const bachsUrl="https://syllaboss.org/api/billing-webhook?provider=bachs&environment=sandbox";
async function bachs(path,body){const response=await fetch(`https://sandbox-api.bachs.io/v1${path}`,{method:body?"POST":"GET",headers:{Authorization:`Bearer ${process.env.BACHS_SANDBOX_SECRET_KEY}`,"Content-Type":"application/json",...(body?{"Idempotency-Key":"syllaboss-sandbox-webhook-v1"}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok)throw new Error(`Bachs webhook setup returned ${response.status} (${data.error_code||"request_error"}).`);return data;}
const endpoints=await bachs("/webhooks/endpoints");
const list=Array.isArray(endpoints)?endpoints:endpoints.data||endpoints.items||endpoints.endpoints||[];
let endpoint=list.find(item=>item.url===bachsUrl);
if(!endpoint)endpoint=await bachs("/webhooks/endpoints",{name:"Syllaboss sandbox membership",url:bachsUrl,event_types:["checkout.completed","customer.subscription.created","customer.subscription.updated","customer.subscription.deleted","invoice.paid","invoice.payment_failed","collection.succeeded","collection.failed"],event_source:"account"});
if(endpoint.signing_secret)save("BACHS_SANDBOX_WEBHOOK_SECRET",endpoint.signing_secret);
else if(!process.env.BACHS_SANDBOX_WEBHOOK_SECRET)throw new Error("The existing Bachs destination has no locally saved signing secret; retrieve or rotate it in the developer portal.");
console.log(JSON.stringify({provider:"bachs",configured:true,id:endpoint.endpoint_id||endpoint.id}));
