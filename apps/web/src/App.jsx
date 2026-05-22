// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Main React component for the flat-mate web client. Handles profile creation,
// swipe-based matching feed, listing creation/browsing, and mutual match display.

import { useMemo, useState } from "react";
import { api } from "./api";

const universities = [
  ["ucl", "UCL"],
  ["kcl", "King's College London"],
  ["lse", "LSE"],
  ["imperial", "Imperial"],
  ["queen_mary", "Queen Mary"],
  ["city_university", "City"],
  ["soas", "SOAS"]
];

const boroughs = [
  ["camden", "Camden"],
  ["islington", "Islington"],
  ["hackney", "Hackney"],
  ["tower_hamlets", "Tower Hamlets"],
  ["southwark", "Southwark"],
  ["lambeth", "Lambeth"],
  ["newham", "Newham"],
  ["greenwich", "Greenwich"]
];

const defaultProfileForm = {
  userId: "",
  name: "",
  studentEmail: "",
  university: "ucl",
  preferredBorough: "camden",
  minRent: 700,
  maxRent: 1200,
  cleanliness: 4,
  noiseTolerance: 2,
  socialLevel: 3,
  smoking: false,
  pets: false,
  bio: ""
};

const defaultListingForm = {
  title: "",
  borough: "camden",
  postcodeArea: "WC1",
  rentPcm: 950,
  billsIncluded: false,
  availableFrom: "",
  roomType: "double",
  description: ""
};

function prettyValue(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function App() {
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [listingForm, setListingForm] = useState(defaultListingForm);
  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [listings, setListings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [listingFilter, setListingFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Create your profile to start swiping for London flatmates.");

  const topCandidate = useMemo(() => feed[0] ?? null, [feed]);

  async function refreshDashboard(activeProfile, selectedBorough = listingFilter) {
    const userId = activeProfile.userId;
    const [nextFeed, nextListings, nextMatches] = await Promise.all([
      api.getFeed(userId),
      api.getListings(selectedBorough),
      api.getMatches(userId)
    ]);

    setFeed(nextFeed);
    setListings(nextListings);
    setMatches(nextMatches);
  }

  async function onCreateProfile(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("Saving your student profile...");

    try {
      const created = await api.createProfile(profileForm);
      setProfile(created);
      setMessage("Profile saved. Start swiping and posting listings.");
      await refreshDashboard(created);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function onSwipe(liked) {
    if (!profile || !topCandidate) {
      return;
    }

    setBusy(true);
    try {
      await api.swipe({
        fromUserId: profile.userId,
        toUserId: topCandidate.userId,
        liked
      });
      setFeed((current) => current.slice(1));
      if (liked) {
        const nextMatches = await api.getMatches(profile.userId);
        setMatches(nextMatches);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateListing(event) {
    event.preventDefault();
    if (!profile) {
      setMessage("Create a profile first.");
      return;
    }

    setBusy(true);
    setMessage("Publishing listing...");
    try {
      await api.createListing({
        ...listingForm,
        ownerUserId: profile.userId
      });
      setListingForm(defaultListingForm);
      setMessage("Listing posted.");
      const nextListings = await api.getListings(listingFilter);
      setListings(nextListings);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function onChangeListingFilter(value) {
    setListingFilter(value);
    setBusy(true);
    try {
      const nextListings = await api.getListings(value);
      setListings(nextListings);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="kicker">London Student Housing</p>
        <h1>flat-mate</h1>
        <p className="subtitle">Swipe for compatible flatmates. Browse and post listings in one place.</p>
        <p className="status">{busy ? "Working..." : message}</p>
      </section>

      {!profile ? (
        <section className="panel profile-panel">
          <h2>Create your profile</h2>
          <form onSubmit={onCreateProfile} className="form-grid">
           <label>
              User ID
              <input
                value={profileForm.userId}
                onChange={(event) => setProfileForm((v) => ({ ...v, userId: event.target.value }))}
                placeholder="jane-ucl-2026"
                required
              />
            </label>
            <label>
              Name
              <input
                value={profileForm.name}
                onChange={(event) => setProfileForm((v) => ({ ...v, name: event.target.value }))}
                placeholder="Jane"
                required
              />
            </label>
            <label>
              Student email
              <input
                type="email"
                value={profileForm.studentEmail}
                onChange={(event) =>
                  setProfileForm((v) => ({ ...v, studentEmail: event.target.value }))
                }
                placeholder="jane@ucl.ac.uk"
                required
              />
            </label>
            <label>
              University
              <select
                value={profileForm.university}
                onChange={(event) => setProfileForm((v) => ({ ...v, university: event.target.value }))}
              >
                {universities.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred borough
              <select
                value={profileForm.preferredBorough}
                onChange={(event) => setProfileForm((v) => ({ ...v, preferredBorough: event.target.value }))}
              >
                {boroughs.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Min rent (pcm)
              <input
                type="number"
                value={profileForm.minRent}
                onChange={(event) => setProfileForm((v) => ({ ...v, minRent: Number(event.target.value) }))}
              />
            </label>
            <label>
              Max rent (pcm)
              <input
                type="number"
                value={profileForm.maxRent}
                onChange={(event) => setProfileForm((v) => ({ ...v, maxRent: Number(event.target.value) }))}
              />
            </label>
            <label>
              Cleanliness
              <input
                type="range"
                min="1"
                max="5"
                value={profileForm.cleanliness}
                onChange={(event) => setProfileForm((v) => ({ ...v, cleanliness: Number(event.target.value) }))}
              />
            </label>
            <label>
              Noise tolerance
              <input
                type="range"
                min="1"
                max="5"
                value={profileForm.noiseTolerance}
                onChange={(event) => setProfileForm((v) => ({ ...v, noiseTolerance: Number(event.target.value) }))}
              />
            </label>
            <label>
              Social level
              <input
                type="range"
                min="1"
                max="5"
                value={profileForm.socialLevel}
                onChange={(event) => setProfileForm((v) => ({ ...v, socialLevel: Number(event.target.value) }))}
              />
            </label>
            <label>
              Bio
              <textarea
                value={profileForm.bio}
                onChange={(event) => setProfileForm((v) => ({ ...v, bio: event.target.value }))}
                placeholder="Early lectures, clean kitchen, and occasional pub quiz."
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={profileForm.smoking}
                onChange={(event) => setProfileForm((v) => ({ ...v, smoking: event.target.checked }))}
              />
              Smoking
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={profileForm.pets}
                onChange={(event) => setProfileForm((v) => ({ ...v, pets: event.target.checked }))}
              />
              Pets
            </label>
            <button disabled={busy} type="submit" className="primary-btn">
              Start matching
            </button>
          </form>
        </section>
      ) : (
        <section className="dashboard">
          <article className="panel match-panel">
            <div className="panel-head">
              <h2>Match feed</h2>
              <span>@{profile.userId}</span>
            </div>
            {topCandidate ? (
              <div className="candidate-card">
                <p className="compatibility">{topCandidate.compatibility}% compatible</p>
                <h3>{topCandidate.name}</h3>
                <p>
                  {prettyValue(topCandidate.university)} · {prettyValue(topCandidate.preferredBorough)}
                </p>
                <p>
                  £{topCandidate.minRent} - £{topCandidate.maxRent} pcm · social {topCandidate.socialLevel}/5
                </p>
                <p>{topCandidate.bio || "No bio yet."}</p>
                <div className="actions">
                  <button disabled={busy} onClick={() => onSwipe(false)} className="ghost-btn">
                    Pass
                  </button>
                  <button disabled={busy} onClick={() => onSwipe(true)} className="primary-btn">
                    Like
                  </button>
                </div>
              </div>
            ) : (
              <p className="empty">No candidates right now. Ask friends to join or adjust preferences.</p>
            )}

            <h3>Matches</h3>
            <div className="match-list">
              {matches.length === 0 ? <p className="empty">No mutual likes yet.</p> : null}
              {matches.map((item) => (
                <div key={item.userId} className="match-chip">
                  <strong>{item.name}</strong>
                  <span>{prettyValue(item.university)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel listings-panel">
            <div className="panel-head">
              <h2>Listings</h2>
              <select value={listingFilter} onChange={(event) => onChangeListingFilter(event.target.value)}>
                <option value="">All boroughs</option>
                {boroughs.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={onCreateListing} className="form-grid compact">
              <label>
                Title
                <input
                  value={listingForm.title}
                  onChange={(event) => setListingForm((v) => ({ ...v, title: event.target.value }))}
                  placeholder="Double room near UCL, 6 min walk"
                  required
                />
              </label>
              <label>
                Borough
                <select
                  value={listingForm.borough}
                  onChange={(event) => setListingForm((v) => ({ ...v, borough: event.target.value }))}
                >
                  {boroughs.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Postcode area
                <input
                  value={listingForm.postcodeArea}
                  onChange={(event) => setListingForm((v) => ({ ...v, postcodeArea: event.target.value }))}
                />
              </label>
              <label>
                Rent (pcm)
                <input
                  type="number"
                  value={listingForm.rentPcm}
                  onChange={(event) => setListingForm((v) => ({ ...v, rentPcm: Number(event.target.value) }))}
                />
              </label>
              <label>
                Available from
                <input
                  type="date"
                  value={listingForm.availableFrom}
                  onChange={(event) => setListingForm((v) => ({ ...v, availableFrom: event.target.value }))}
                />
              </label>
              <label>
                Room type
                <select
                  value={listingForm.roomType}
                  onChange={(event) => setListingForm((v) => ({ ...v, roomType: event.target.value }))}
                >
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="studio">Studio</option>
                </select>
              </label>
              <label>
                Description
                <textarea
                  value={listingForm.description}
                  onChange={(event) => setListingForm((v) => ({ ...v, description: event.target.value }))}
                />
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={listingForm.billsIncluded}
                  onChange={(event) => setListingForm((v) => ({ ...v, billsIncluded: event.target.checked }))}
                />
                Bills included
              </label>
              <button disabled={busy} className="primary-btn" type="submit">
                Post listing
              </button>
            </form>

            <div className="listing-grid">
              {listings.length === 0 ? <p className="empty">No listings in this view yet.</p> : null}
              {listings.map((listing) => (
                <article key={listing.listingId} className="listing-card">
                  <h4>{listing.title}</h4>
                  <p>
                    {prettyValue(listing.borough)} · £{listing.rentPcm} pcm
                  </p>
                  <p>
                    {listing.roomType} room · {listing.billsIncluded ? "Bills included" : "Bills excluded"}
                  </p>
                  <p>{listing.description || "No extra details."}</p>
                  <small>
                    Owner: {listing.ownerUserId} · {listing.postcodeArea}
                  </small>
                </article>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
