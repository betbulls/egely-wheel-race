// ISO 3166-1 alpha-2 codes for the optional country picker. We store only the 2-letter
// code on the profile; the dropdown label comes from the browser's Intl.DisplayNames
// (falls back to the code on old engines), and the flag image comes from flagcdn.com.
// Keeping just codes here avoids bundling a long name list.
export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GT','GU','GW','GY',
  'HK','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'YE','YT',
  'ZA','ZM','ZW',
];

// Human label for a code, via the browser. Falls back to the bare code on old engines.
let _dn = null;
try { _dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { _dn = null; }
export function countryName(code){
  if(!code) return '';
  try { return (_dn && _dn.of(code)) || code; } catch { return code; }
}

// Small flag image (renders on every OS, unlike flag emoji which Windows can't show).
export function flagUrl(code){
  return code ? `https://flagcdn.com/40x30/${String(code).toLowerCase()}.png` : '';
}
