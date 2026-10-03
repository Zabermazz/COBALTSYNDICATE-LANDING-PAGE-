import 'server-only';
import data from './manual-giveaways.json';
import {manualGiveawaysSchema} from './manual-giveaway-schema';
export function manualGiveaways(){return manualGiveawaysSchema.parse(data);}
