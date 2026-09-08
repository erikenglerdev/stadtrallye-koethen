import rawCodes from '../../data/team-codes.json';
if(rawCodes.length!==new Set(rawCodes).size || rawCodes.some(c=>!/^K-[A-Z2-9]{6}$/.test(c))) throw new Error('Invalid team code configuration');
const teamCodes=new Set(rawCodes);
export function acceptedTeamCode(code:string) {return teamCodes.has(code);}
