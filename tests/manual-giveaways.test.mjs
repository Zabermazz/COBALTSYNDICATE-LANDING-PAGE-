import {test} from 'node:test';
import assert from 'node:assert/strict';
import {manualGiveawaysSchema,manualGiveawaySchema,manualState,giveawayTemplate} from '../lib/manual-giveaway-schema.ts';
const g={...giveawayTemplate(),status:'open',entryUrl:'https://forms.gle/example'};
test('timer respects exact opening and closing boundaries and overrides',()=>{
 assert.equal(manualState(g,Date.parse(g.startsAt)-1),'Upcoming');assert.equal(manualState(g,Date.parse(g.startsAt)),'Open');assert.equal(manualState(g,Date.parse(g.endsAt)),'Closed');assert.equal(manualState({...g,status:'paused'},Date.parse(g.startsAt)),'Paused');assert.equal(manualState({...g,status:'draft'}),'Draft');
});
test('template validation rejects unsafe links, duplicates and incomplete open rounds',()=>{
 assert.ok(!manualGiveawaysSchema.safeParse([g,g]).success);
 for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','bad-url'])assert.ok(!manualGiveawaySchema.safeParse({...g,entryUrl:url}).success);
 assert.ok(!manualGiveawaySchema.safeParse({...g,entryUrl:''}).success);assert.ok(!manualGiveawaySchema.safeParse({...g,endsAt:g.startsAt}).success);assert.ok(manualGiveawaySchema.safeParse(giveawayTemplate()).success);
});
