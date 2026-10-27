import { queryByWhere } from "./queryService.js";
function escapeSql(value) {return String(value).replace(/'/g, "''");}
  
export async function getTerritorialAuthorities(roadsLayer) {
  const features = await queryByWhere(
    roadsLayer,
    `
        territorial_authority IS NOT NULL
        AND territorial_authority <> ''
      `,
    ["OBJECTID", "territorial_authority"],
  );
  const authorities = [
    ...new Set(
      features
        .map((feature) =>
          String(feature.attributes?.territorial_authority ?? "").trim(),
        )
        .filter(Boolean),
    ),
  ];
  return authorities.sort((a, b) => a.localeCompare(b));
}

export async function getLocalitiesForAuthority( roadsLayer,territorialAuthority,) 
 {
  const safeAuthority = escapeSql(territorialAuthority);
  const features = await queryByWhere(
    roadsLayer,
    `
        territorial_authority = '${safeAuthority}'
        AND locality IS NOT NULL
        AND locality <> ''
      `,
    ["OBJECTID", "locality", "territorial_authority"],
  );
  const localities = [
    ...new Set(
      features
        .map((feature) => String(feature.attributes?.locality ?? "").trim())
        .filter(Boolean),
    ),
  ];

  return localities.sort((a, b) => a.localeCompare(b));
}

export async function getRoadsForLocality(
  roadsLayer,
  territorialAuthority,
  locality,
) {
  const safeAuthority = escapeSql(territorialAuthority);
  const safeLocality = escapeSql(locality);
  return queryByWhere(
    roadsLayer,
    `
      territorial_authority = '${safeAuthority}'
      AND locality = '${safeLocality}'
    `,
  );
}
export function roadLabel(feature) {
  return String(
    feature.attributes?.name ?? feature.attributes?.OBJECTID ?? "Road",
  ).trim();
}
