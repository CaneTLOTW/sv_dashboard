import test from "node:test";
import assert from "node:assert/strict";
import {capacityFor,calculateRange} from "../custom_components/sv_dashboard/static/range-calculator-core.js";
const model={mode:"fitted",base_rate:14,cold_slope:.2,startup_kwh:1.25,min_temperature_c:-5,max_temperature_c:20,holdout_error_rate:2};
const v={capacity:41.5,basis:"current",soh:93,referenceSoh:93,soc:100,reserve:10,temp:-4,target:240,speed:80,extra:0};
test("capacity is not reduced twice; new capacity applies SoH once",()=>{assert.equal(capacityFor(41.5,"current",93,93),41.5);assert.ok(Math.abs(capacityFor(44,"new",93,93)-40.92)<1e-8);assert.equal(capacityFor(44,"new",null,null),null);});
test("cold, reserve and route cost reduce range; startup is capped",()=>{const r=calculateRange(model,v);assert.equal(r.startup,1.25);assert.ok(r.shortfall>0);assert.ok(r.conservativeRange<r.range);assert.ok(calculateRange(model,{...v,temp:20}).range>r.range);assert.ok(calculateRange(model,{...v,target:5}).startup<r.startup);assert.equal(calculateRange(model,{...v,soc:5}).range,0);assert.ok(calculateRange(model,{...v,extra:20}).range<r.range);});
test("missing evidence never yields invented prediction",()=>{assert.equal(calculateRange(model,{...v,capacity:null}),null);assert.equal(calculateRange({mode:"scenario",reference_rate:20},v),null);assert.ok(calculateRange({mode:"scenario",reference_rate:20},{...v,referenceTemp:10}));});
