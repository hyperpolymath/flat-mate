// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// House-agreement draft generator (design §9.2) — the one intervention with
// practitioner consensus. Generated FROM the group's actual divergence
// points: the audit already knows where they disagree.
//
// Universal sections appear for EVERY group regardless of answers:
//   - "Access & needs": prompted unconditionally so the conversation happens
//     with ZERO stored signal (no Art. 9 field exists to leak — design §5)
//   - "Guarantors & money setup": same pattern (guarantor status is a
//     nationality proxy; checklist, never a field)
//   - 48-hour raise-it conflict process; exit/replacement clause
//     (joint-and-several liability makes the weakest link financially real)

import { CLEANLINESS_ANCHORS, ENGINE_VERSION } from "./constants.js";

const section = (id, title, body, fromDivergence = false) => ({ id, title, body, fromDivergence });

/**
 * Build a structured agreement draft from a group and its audit.
 * @returns {{ groupName, engineVersion, sections: [{id,title,body,fromDivergence}] }}
 */
export function buildHouseAgreement(group, audit) {
  const members = group.members;
  const sections = [];

  // --- cleaning -------------------------------------------------------------
  const levels = members.map((m) => m.cleanliness);
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  if (hi - lo >= 2) {
    const loNames = members.filter((m) => m.cleanliness === lo).map((m) => m.name).join(", ");
    const hiNames = members.filter((m) => m.cleanliness === hi).map((m) => m.name).join(", ");
    sections.push(section(
      "cleaning",
      "Cleaning standard & rota",
      `Standards differ: ${hiNames} (${hi}/5 — "${
        CLEANLINESS_ANCHORS[hi]
      }") vs ${loNames} (${lo}/5 — "${
        CLEANLINESS_ANCHORS[lo]
      }"). Without a rota, shared spaces will settle at ${lo}/5 and resentment at the top. Agree: a written rota with named tasks, and what "done" means for kitchen and bathroom.`,
      true,
    ));
  } else {
    sections.push(section(
      "cleaning",
      "Cleaning standard & rota",
      `Standards are close (${lo}–${hi}/5). Agree a light rota anyway — alignment today is not a system.`,
    ));
  }

  // --- quiet hours ------------------------------------------------------------
  const bedtimes = [...new Set(members.map((m) => m.bedtime).filter(Boolean))];
  if (bedtimes.length > 1) {
    sections.push(section(
      "quiet-hours",
      "Quiet hours",
      `Sleep schedules differ (${
        bedtimes.join(" vs ")
      }). Agree quiet hours that protect the earliest sleeper and a headphones-after rule, including weekends.`,
      true,
    ));
  }

  // --- guests & partners --------------------------------------------------------
  const guestSpread = [...new Set(members.map((m) => m.guestFrequency).filter(Boolean))];
  const frequentPartners = members.filter((m) => m.partnerStays === "frequent").map((m) => m.name);
  if (guestSpread.length > 1 || frequentPartners.length) {
    const partnerLine = frequentPartners.length
      ? ` ${frequentPartners.join(" and ")} ha${
        frequentPartners.length === 1 ? "s" : "ve"
      } a partner staying most nights — agree whether that's a de facto housemate, and how bills and bathroom time account for it.`
      : "";
    sections.push(section(
      "guests",
      "Guests & partners",
      `Guest norms differ across the house.${partnerLine} Agree: max overnight guest nights per week, advance notice, and a partner-stays cap before it becomes a row.`,
      true,
    ));
  }

  // --- smoking ------------------------------------------------------------------
  const smokers = members.filter((m) => m.smoking && m.smoking !== "no").map((m) => m.name);
  if (smokers.length) {
    sections.push(section(
      "smoking",
      "Smoking",
      `${
        smokers.join(" and ")
      } smoke(s). Agree the rule now (outdoors-only is the usual peace treaty) and where it applies — balcony, garden, window rules.`,
      true,
    ));
  }

  // --- drinking & parties ----------------------------------------------------------
  const drinkSpread = [...new Set(members.map((m) => m.drinking).filter(Boolean))];
  if (drinkSpread.length > 1) {
    sections.push(section(
      "hosting",
      "Drinking & hosting",
      `Drinking/hosting habits differ (${
        drinkSpread.join(" vs ")
      }). Agree hosting frequency, weeknight rules, and a no-surprise-parties norm.`,
      true,
    ));
  }

  // --- money norms -------------------------------------------------------------------
  const billPrefs = [...new Set(members.map((m) => m.billSplitPreference).filter(Boolean))];
  sections.push(section(
    "money",
    "Bills & shared costs",
    billPrefs.length > 1
      ? `Preferences differ (${
        billPrefs.join(" vs ")
      }). Pick ONE method at the first house meeting, name who pays which provider, and set a payment day. Shared staples (cleaning supplies, oil, salt) need a kitty or a rule.`
      : "Pick a bill-split method, name who pays which provider, set a payment day, and agree how shared staples are bought. Anticipated bills cause little conflict; surprise ones end households.",
    billPrefs.length > 1,
  ));

  // --- universal sections (always present, zero stored signal) ---------------------------
  sections.push(section(
    "access-needs",
    "Access & needs",
    "Each housemate: is there anything about the home setup you need to work — access, allergies, medical storage, prayer or study space, temperature, anything else? Discuss in person; the platform deliberately stores nothing here.",
  ));
  sections.push(section(
    "guarantors",
    "Guarantors & tenancy setup",
    "Each member confirms their guarantor arrangement before the property search (UK landlords typically require a UK guarantor at ~3x rent; paid services exist from ~£31/month). UK joint tenancies are usually joint-and-several: each of you is liable for ALL the rent — one member's failure is everyone's problem. Confirm everyone's plan now, in person; the platform stores no guarantor data.",
  ));
  sections.push(section(
    "conflict",
    "Raising problems",
    audit?.warnings?.some((w) => w.includes("avoid conflict"))
      ? "This house leans conflict-avoidant — which is how small breaches become moving-out fights. Adopt the 48-hour rule as a hard norm: raise it within two days or let it go, and hold a short monthly house meeting regardless."
      : "Adopt the 48-hour rule: anything bothering you gets raised within two days or let go. Issues raised early resolve; issues hoarded explode.",
  ));
  sections.push(section(
    "exit",
    "Exit & replacement",
    "Agree now what happens if someone needs to leave mid-tenancy: notice to housemates, who finds the replacement, veto rules on the newcomer, and how the deposit share transfers. Doing this while everyone is friends costs nothing; doing it during a breakup costs the friendship.",
  ));

  return { groupName: group.name, engineVersion: ENGINE_VERSION, sections };
}

/** Render an agreement draft as markdown. */
export function renderAgreementMarkdown(agreement) {
  const lines = [
    `# House agreement draft — ${agreement.groupName}`,
    "",
    "_Generated from the group's own questionnaire divergences. Edit together, in person; this is a conversation script, not a contract._",
    "",
  ];
  for (const s of agreement.sections) {
    lines.push(`## ${s.title}${s.fromDivergence ? " ⚠" : ""}`, "", s.body, "");
  }
  return lines.join("\n");
}
