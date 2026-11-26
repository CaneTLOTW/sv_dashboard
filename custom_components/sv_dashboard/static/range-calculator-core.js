// Local planning scenario; no vehicle service calls.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function num(v){if(v===null||v===undefined||v===""||typeof v==="boolean")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
const bounded=(v,a,b)=>{const n=num(v);return n!==null&&n>=a&&n<=b?n:null;};
const cold=t=>clamp(15-t,0,35);
export function capacityFor(c,basis,h,reference){c=bounded(c,1,300);h=bounded(h,1,100);reference=bounded(reference,1,100);if(c===null)return null;if(basis==="new")return h===null?null:c*h/100;if(basis!=="current")return null;return h!==null&&reference!==null?c*h/reference:c;}
export function calculateRange(m,v){
  const c=capacityFor(v.capacity,v.basis,v.soh,v.referenceSoh),soc=bounded(v.soc,0,100),reserve=bounded(v.reserve,0,50),temp=bounded(v.temp,-25,40),target=bounded(v.target,1,1500),speed=bounded(v.speed,10,130),extra=bounded(v.extra,0,60);
  if([c,soc,reserve,temp,target,speed,extra].some(x=>x===null)||!m)return null;
  let base,slope,startup,error,extrapolated=true;
  if(m.mode==="fitted"){
    base=bounded(m.base_rate,6,40);slope=bounded(m.cold_slope,0,.8);startup=bounded(m.startup_kwh,0,3);
    if([base,slope,startup].some(x=>x===null))return null;
    error=Math.max(2,num(m.holdout_error_rate)??0);
    extrapolated=num(m.min_temperature_c)===null||num(m.max_temperature_c)===null||temp<m.min_temperature_c||temp>m.max_temperature_c;
  }else if(m.mode==="scenario"){
    const rate=bounded(m.reference_rate,3,80),ref=bounded(m.reference_temperature_c,-40,50)??bounded(v.referenceTemp,-25,40);
    if(rate===null||ref===null)return null;
    slope=.2;startup=1.25;
    const distance=bounded(m.reference_mean_distance_km,2,2000);
    const referenceCold=bounded(m.reference_cold_degree,0,35)??cold(ref);
    const startRate=bounded(m.reference_startup_per_100km,0,50)??(distance===null?0:100*Math.min(1,cold(ref)/15)*Math.min(1,distance/15)/distance);
    base=Math.max(6,rate-slope*referenceCold-startup*startRate);error=Math.max(3,rate*.18);
  }else return null;
  const running=(base+slope*cold(temp))*(1+extra/100),margin=Math.max(error,running*.12)*(extrapolated?1.3:1);
  const available=c*soc/100,budget=Math.max(0,available-c*reserve/100);
  const start=km=>startup*Math.min(1,cold(temp)/15)*Math.min(1,km/speed*4);
  const energy=(km,conservative=false)=>km*(running+(conservative?margin:0))/100+start(km);
  const solve=(limit,conservative=false)=>{let lo=0,hi=5000;if(limit<=0)return 0;for(let j=0;j<45;j++){const mid=(lo+hi)/2;if(energy(mid,conservative)<=limit)lo=mid;else hi=mid;}return lo;};
  const need=energy(target),high=energy(target,true);
  return {capacity:c,range:solve(budget),conservativeRange:solve(budget,true),energy:need,high,arrival:clamp(100*(available-need)/c,0,100),lowArrival:clamp(100*(available-high)/c,0,100),shortfall:Math.max(0,high-budget),unreachable:need>available,running,startup:start(target),extrapolated};
}
