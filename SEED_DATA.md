# Cedar Grove · Task Tracker — Seed Data

> Source of truth: `CedarGrove_Master_Tracker.xlsx` and `Staff_Directory.xlsx`.
> Where `contacts.csv` disagreed (e.g. `cjrose@` vs `crose@`, a nonexistent
> "Tyra Ward"), the Excel files win and the CSV was ignored.
> Build `db/seed.sql` from the tables below. Re-confirm vacancies and emails with
> Geoff at deploy time — staff turns over.

---

## 1. Regions

| Region | Regional Manager | RM login email | Notes |
|---|---|---|---|
| Florida | Jerika Ward | `jward@covenantpropertyservices.com` | |
| Georgia | Jerika Ward | `jward@covenantpropertyservices.com` | Role winding down; keep reassignable. |
| North Carolina | — (none) | — | No RM. Escalations → Geoff + Steve only. |
| Virginia | Crystal Martin | (confirm at deploy) | |

A property belongs to exactly one region. Reassigning a region's manager is a
one-row change.

---

## 2. Properties (14)

| Property | Region | State | City | Units | Main phone |
|---|---|---|---|---|---|
| Kings Tree | Florida | FL | Orange Park | 96 | 904-375-1102 |
| Lakewood Oaks | Florida | FL | Jacksonville | 138 | 904-849-4410 |
| Magnolia Point | Florida | FL | Jacksonville | 227 | 904-734-0455 |
| Oasis Club | Florida | FL | Jacksonville | 242 | 904-298-8387 |
| Park Place | Florida | FL | Orange Park | 70 | 904-264-0625 |
| Silversmith Creek | Florida | FL | Jacksonville | 140 | 904-416-0222 |
| Aurora @ Twenty Seven Hundred | Georgia | GA | Lilburn | 280 | 470-592-8622 |
| Cielo @ 325 | Georgia | GA | Austell | 120 | 404-474-1760 |
| Andover Park | North Carolina | NC | Greensboro | 120 | 336-900-5964 |
| Fields Conover | North Carolina | NC | Conover | 160 | 828-466-2202 |
| L Building | North Carolina | NC | Raleigh | 83 | 919-615-3006 |
| Lansdale Garden | Virginia | VA | Norfolk | 96 | 757-855-5588 |
| Miramar | Virginia | VA | Norfolk | 155 | 757-855-5590 |
| Windsor Court | Virginia | VA | Newport News | 99 | 757-596-4242 |

---

## 3. Property role mailboxes (ping routing targets)

One row per (property, function). A mailbox can receive pings even with no human
user attached. `null` = no mailbox known yet; confirm with Geoff before assigning
to that function. PM mailboxes shared across two properties are noted.

| Property | Function | Role mailbox |
|---|---|---|
| Kings Tree | property_manager | `kingsparkpm@covenantpropertyservices.com` |
| Kings Tree | leasing | null (confirm) |
| Kings Tree | maintenance | null (confirm) |
| Lakewood Oaks | property_manager | `LakewoodOaksPM@covenantpropertyservices.com` |
| Lakewood Oaks | leasing | `Lakewoodoaksleasing@covenantpropertyservices.com` |
| Lakewood Oaks | maintenance | null (confirm) |
| Magnolia Point | property_manager | `magnoliapointpm@covenantpropertyservices.com` |
| Magnolia Point | assistant_property_manager | `magnoliapointapm@covenantpropertyservices.com` |
| Magnolia Point | leasing | `magnoliapointleasing@covenantpropertyservices.com` |
| Oasis Club | property_manager | `oasisclubpm@covenantpropertyservices.com` |
| Oasis Club | assistant_property_manager | `oasisclubapm@covenantpropertyservices.com` |
| Oasis Club | leasing | `oasisclubleasing@covenantpropertyservices.com` |
| Park Place | property_manager | `kingsparkpm@covenantpropertyservices.com` (shared w/ Kings Tree) |
| Silversmith Creek | property_manager | `SilversmithPM@covenantpropertyservices.com` (PM seat vacant) |
| Aurora @ 2700 | property_manager | `aurora2700PM@covenantpropertyservices.com` |
| Aurora @ 2700 | assistant_property_manager | `aurora2700APM@covenantpropertyservices.com` |
| Aurora @ 2700 | leasing | `aurora2700leasing@covenantpropertyservices.com` |
| Cielo @ 325 | property_manager | `Cielo325PM@covenantpropertyservices.com` |
| Cielo @ 325 | leasing | `GALeasingFloater@covenantpropertyservices.com` (GA leasing floater) |
| Andover Park | property_manager | `crose@covenantpropertyservices.com` (CJ Rose) |
| Fields Conover | property_manager | `crose@covenantpropertyservices.com` (CJ Rose, shared) |
| L Building | property_manager | null (PM seat vacant) |
| Lansdale Garden | (all) | null — VA role mailboxes TBD, confirm with Geoff/Crystal |
| Miramar | (all) | null — VA role mailboxes TBD |
| Windsor Court | (all) | null — VA role mailboxes TBD |

---

## 4. Super admins (seed)

| Name | Login email |
|---|---|
| Geoff Girnun | `geoff@cedargrovecp.com` |
| Steven Levitz | `steve@cedargrovecp.com` |
| Aaron Gorin | `aarongorin@gmail.com` |

## 5. User-management capability (can grant access / manage users)

Geoff, Steve, Aaron, **Cara McConnachie**, **Jackie Eriksen**. Model Cara and
Jackie via a `can_manage_users` capability (or seed as `super_admin` — Geoff to
decide; flag the tradeoff).

## 6. Corporate / wide-access users

| Name | Login email | Title | RBAC role |
|---|---|---|---|
| Aaron Gorin | `aarongorin@gmail.com` | Partner | super_admin |
| Steven Levitz | `steve@cedargrovecp.com` | Partner | super_admin |
| Geoff Girnun | `geoff@cedargrovecp.com` | VP Operations / Asset Manager | super_admin |
| Cara McConnachie | `cara@covenantpropertyservices.com` | Mgr, Property & Lease Admin | super_admin or can_manage_users |
| Jackie Eriksen | `jackie@covenantpropertyservices.com` | Talent Acquisitions Mgr | super_admin or can_manage_users |
| Shelley Balanda | `shelley@covenantpropertyservices.com` | Operations | regional/corporate — confirm scope w/ Geoff |

---

## 7. Staff roster

`Login email` blank = no company account; **ping-only recipient via role mailbox,
cannot log in.** RBAC role assigned per §4a of CLAUDE.md. Status `OPEN`/`Vacant`
= seat exists, no person; keep the role mailbox active for pings.

### Florida — region: Jerika Ward

| Property | Name | Function | Login email |
|---|---|---|---|
| Kings Tree | Ayonda Parsons | property_manager | `kingsparkpm@covenantpropertyservices.com` |
| Kings Tree | Jania Bristol | leasing | — |
| Kings Tree | Henry Avila Acevedo | maintenance (Supervisor, EPA) | — |
| Kings Tree | Julio Diaz Rodriguez | maintenance (Tech, EPA) | — |
| Lakewood Oaks | Vivianna Pinero | property_manager | `LakewoodOaksPM@covenantpropertyservices.com` |
| Lakewood Oaks | Pedro Tellez Dacal | leasing | `Lakewoodoaksleasing@covenantpropertyservices.com` |
| Lakewood Oaks | Luis Perez Cancel | maintenance (Supervisor, EPA) | — |
| Lakewood Oaks | Sanchesz Maultsby | maintenance (Tech) | — |
| Lakewood Oaks | Alexei Freire Goyes | groundskeeper/porter | — |
| Magnolia Point | Jerika Ward | regional_manager | `jward@covenantpropertyservices.com` |
| Magnolia Point | Tyra Jackson | property_manager | `magnoliapointpm@covenantpropertyservices.com` |
| Magnolia Point | Leyla Nieto Perez | assistant_property_manager | `magnoliapointapm@covenantpropertyservices.com` |
| Magnolia Point | Luis Batencourt | leasing | `magnoliapointleasing@covenantpropertyservices.com` |
| Magnolia Point | Gerardo Ceron Ayala | maintenance (Supervisor, EPA) | — |
| Magnolia Point | Edison Daniel, Jn | maintenance (Tech, EPA) | — |
| Magnolia Point | Danilo Menendez Rabassa | groundskeeper | — |
| Oasis Club | Linda Quasnick | property_manager | `oasisclubpm@covenantpropertyservices.com` |
| Oasis Club | Elma Avila | assistant_property_manager | `oasisclubapm@covenantpropertyservices.com` |
| Oasis Club | *Vacant* | leasing (OPEN) | `oasisclubleasing@covenantpropertyservices.com` |
| Oasis Club | Diosmel Avila Pozo | groundskeeper | — |
| Park Place | Ayonda Parsons | property_manager | `kingsparkpm@covenantpropertyservices.com` |
| Park Place | Jania Bristol | leasing | — |
| Park Place | Henry Avila Acevedo | maintenance (Supervisor, EPA) | — |
| Park Place | Julio Diaz Rodriguez | maintenance (Tech, EPA) | — |
| Silversmith Creek | *Vacant* | property_manager (OPEN) | `SilversmithPM@covenantpropertyservices.com` |
| Silversmith Creek | Aldo Velasco Diaz | maintenance (Supervisor, EPA) | `aldovelasco08@gmail.com` (personal) |
| Silversmith Creek | Eddys Monzon | maintenance (Tech) | — |

### Georgia — region: Jerika Ward

| Property | Name | Function | Login email |
|---|---|---|---|
| Aurora @ 2700 | Mariela Rivas | property_manager | `aurora2700PM@covenantpropertyservices.com` |
| Aurora @ 2700 | Teyani Stanton | assistant_property_manager | `aurora2700APM@covenantpropertyservices.com` |
| Aurora @ 2700 | *Vacant* | leasing (OPEN) | `aurora2700leasing@covenantpropertyservices.com` |
| Aurora @ 2700 | *Vacant* | maintenance (Supervisor, OPEN) | — |
| Aurora @ 2700 | *Vacant* | maintenance (Tech, OPEN) | — |
| Cielo @ 325 | Dana Darby | property_manager | `Cielo325PM@covenantpropertyservices.com` |
| Cielo @ 325 | Jazmin Fuentes | leasing | `GALeasingFloater@covenantpropertyservices.com` |
| Cielo @ 325 | Rasim Memishi | maintenance (Supervisor, EPA) | — |

### North Carolina — region: none (corporate oversight)

| Property | Name | Function | Login email |
|---|---|---|---|
| Andover Park | Courtney (CJ) Rose | property_manager | `crose@covenantpropertyservices.com` |
| Andover Park | Ariel Handy | leasing | — |
| Andover Park | Marcus Davis | maintenance (Supervisor, EPA) | `kaharidavis1@gmail.com` (personal) |
| Fields Conover | Courtney (CJ) Rose | senior_property_manager | `crose@covenantpropertyservices.com` |
| L Building | *Vacant* | property_manager (OPEN) | — |

> Fields Conover / L Building: confirm remaining staff with Geoff — directory was
> truncated for these.

### Virginia — region: Crystal Martin

| Property | Name | Function | Login email |
|---|---|---|---|
| Lansdale Garden / Miramar / Windsor Court | Crystal Martin | regional_manager | (confirm at deploy) |

> VA on-site staff and role mailboxes not in the source files. Geoff/Crystal to
> provide before VA goes live.

---

## 8. Allowlist (outside the two domains)

| Email | Who | Notes |
|---|---|---|
| `aarongorin@gmail.com` | Aaron Gorin | Founder, personal Gmail. |
| `<prefix>@riveredgeadvisors.com` | River Edge Advisors | Invited individuals only. **Add specific addresses here at deploy time.** |

Personal Gmails attached to staff (e.g. `aldovelasco08@gmail.com`,
`kaharidavis1@gmail.com`) are contact info, **not login allowlist entries** unless
Geoff explicitly wants those people to log in. Default: they remain ping-only.

---

## 9. Data-model note for the seeder

Three tables drive everything: `regions`, `properties` (FK → region),
`role_mailboxes` (FK → property, + function enum, nullable email). `users` are
created on first Google sign-in via the Clerk webhook and then granted role +
property/region assignments by an admin — so **do not pre-create login users from
this roster except the super-admin seed (§4).** The roster's purpose is to
(a) seed `role_mailboxes` and (b) populate the assignee autocomplete directory.
Confirm this split with Geoff before writing `seed.sql`.
