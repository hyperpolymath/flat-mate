// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Main React Native component for the flat-mate mobile client. Provides profile creation,
// swipe-based matching, listing creation/browsing, and mutual match display via tab navigation.

import React, { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { api } from "./src/api";

const UNIVERSITY_OPTIONS = ["ucl", "kcl", "lse", "imperial", "queen_mary", "city_university", "soas"];
const BOROUGH_OPTIONS = ["camden", "islington", "hackney", "tower_hamlets", "southwark", "lambeth"];

const profileDefaults = {
  userId: "",
  name: "",
  studentEmail: "",
  university: "ucl",
  preferredBorough: "camden",
  minRent: "700",
  maxRent: "1200",
  cleanliness: "4",
  noiseTolerance: "2",
  socialLevel: "3",
  smoking: false,
  pets: false,
  bio: ""
};

const listingDefaults = {
  title: "",
  borough: "camden",
  postcodeArea: "WC1",
  rentPcm: "950",
  billsIncluded: false,
  availableFrom: "",
  roomType: "double",
  description: ""
};

const tabItems = ["matching", "listings", "matches"];

function SelectChips({ label, value, options, onChange }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipsWrap}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, value === option ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, value === option ? styles.chipTextActive : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [profileForm, setProfileForm] = useState(profileDefaults);
  const [listingForm, setListingForm] = useState(listingDefaults);
  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [listings, setListings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState("matching");
  const [status, setStatus] = useState("Create a student profile to start.");
  const [busy, setBusy] = useState(false);

  const topCandidate = useMemo(() => feed[0] ?? null, [feed]);

  async function hydrate(userId) {
    const [nextFeed, nextListings, nextMatches] = await Promise.all([
      api.getFeed(userId),
      api.getListings(),
      api.getMatches(userId)
    ]);
    setFeed(nextFeed);
    setListings(nextListings);
    setMatches(nextMatches);
  }

  async function onCreateProfile() {
    setBusy(true);
    setStatus("Saving profile...");
    try {
      const created = await api.createProfile({
        ...profileForm,
        minRent: Number(profileForm.minRent),
        maxRent: Number(profileForm.maxRent),
        cleanliness: Number(profileForm.cleanliness),
        noiseTolerance: Number(profileForm.noiseTolerance),
        socialLevel: Number(profileForm.socialLevel)
      });
      setProfile(created);
      await hydrate(created.userId);
      setStatus("Profile saved. Swipe for flatmates.");
    } catch (error) {
      setStatus(error.message);
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
      await api.swipe({ fromUserId: profile.userId, toUserId: topCandidate.userId, liked });
      setFeed((current) => current.slice(1));
      if (liked) {
        const nextMatches = await api.getMatches(profile.userId);
        setMatches(nextMatches);
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateListing() {
    if (!profile) {
      return;
    }

    setBusy(true);
    try {
      await api.createListing({
        ...listingForm,
        ownerUserId: profile.userId,
        rentPcm: Number(listingForm.rentPcm)
      });
      setListingForm(listingDefaults);
      const nextListings = await api.getListings();
      setListings(nextListings);
      setStatus("Listing posted.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.kicker}>London student housing</Text>
          <Text style={styles.title}>flat-mate</Text>
          <Text style={styles.status}>{status}</Text>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Create profile</Text>
            <TextInput
              style={styles.input}
              value={profileForm.userId}
              onChangeText={(userId) => setProfileForm((v) => ({ ...v, userId }))}
              placeholder="user id"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={profileForm.name}
              onChangeText={(name) => setProfileForm((v) => ({ ...v, name }))}
              placeholder="name"
            />
            <TextInput
              style={styles.input}
              value={profileForm.studentEmail}
              onChangeText={(studentEmail) => setProfileForm((v) => ({ ...v, studentEmail }))}
              placeholder="student email"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <SelectChips
              label="University"
              value={profileForm.university}
              options={UNIVERSITY_OPTIONS}
              onChange={(university) => setProfileForm((v) => ({ ...v, university }))}
            />
            <SelectChips
              label="Preferred borough"
              value={profileForm.preferredBorough}
              options={BOROUGH_OPTIONS}
              onChange={(preferredBorough) => setProfileForm((v) => ({ ...v, preferredBorough }))}
            />

            <View style={styles.inlineFields}>
              <TextInput
                style={[styles.input, styles.half]}
                value={profileForm.minRent}
                onChangeText={(minRent) => setProfileForm((v) => ({ ...v, minRent }))}
                placeholder="min rent"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.half]}
                value={profileForm.maxRent}
                onChangeText={(maxRent) => setProfileForm((v) => ({ ...v, maxRent }))}
                placeholder="max rent"
                keyboardType="numeric"
              />
            </View>

            <TextInput
              style={styles.input}
              value={profileForm.cleanliness}
              onChangeText={(cleanliness) => setProfileForm((v) => ({ ...v, cleanliness }))}
              placeholder="cleanliness 1-5"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={profileForm.noiseTolerance}
              onChangeText={(noiseTolerance) => setProfileForm((v) => ({ ...v, noiseTolerance }))}
              placeholder="noise tolerance 1-5"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={profileForm.socialLevel}
              onChangeText={(socialLevel) => setProfileForm((v) => ({ ...v, socialLevel }))}
              placeholder="social level 1-5"
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={profileForm.bio}
              onChangeText={(bio) => setProfileForm((v) => ({ ...v, bio }))}
              placeholder="bio"
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Smoking</Text>
              <Switch
                value={profileForm.smoking}
                onValueChange={(smoking) => setProfileForm((v) => ({ ...v, smoking }))}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Pets</Text>
              <Switch value={profileForm.pets} onValueChange={(pets) => setProfileForm((v) => ({ ...v, pets }))} />
            </View>

            <Pressable disabled={busy} onPress={onCreateProfile} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Start matching</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.kicker}>@{profile.userId}</Text>
        <Text style={styles.title}>flat-mate</Text>
        <Text style={styles.status}>{busy ? "Working..." : status}</Text>

        <View style={styles.tabBar}>
          {tabItems.map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tabItem, tab === item ? styles.tabItemActive : null]}>
              <Text style={[styles.tabText, tab === item ? styles.tabTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "matching" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Match feed</Text>
            {topCandidate ? (
              <View style={styles.card}>
                <Text style={styles.compat}>{topCandidate.compatibility}% compatibility</Text>
                <Text style={styles.cardTitle}>{topCandidate.name}</Text>
                <Text style={styles.cardLine}>{topCandidate.university} · {topCandidate.preferredBorough}</Text>
                <Text style={styles.cardLine}>£{topCandidate.minRent} - £{topCandidate.maxRent} pcm</Text>
                <Text style={styles.cardLine}>{topCandidate.bio || "No bio."}</Text>
                <View style={styles.actionRow}>
                  <Pressable onPress={() => onSwipe(false)} style={styles.ghostButton}>
                    <Text>Pass</Text>
                  </Pressable>
                  <Pressable onPress={() => onSwipe(true)} style={styles.primaryButtonSmall}>
                    <Text style={styles.primaryButtonText}>Like</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.cardLine}>No candidates in feed yet.</Text>
            )}
          </View>
        ) : null}

        {tab === "listings" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Listings</Text>
            <TextInput
              style={styles.input}
              value={listingForm.title}
              onChangeText={(title) => setListingForm((v) => ({ ...v, title }))}
              placeholder="Listing title"
            />
            <SelectChips
              label="Borough"
              value={listingForm.borough}
              options={BOROUGH_OPTIONS}
              onChange={(borough) => setListingForm((v) => ({ ...v, borough }))}
            />
            <TextInput
              style={styles.input}
              value={listingForm.postcodeArea}
              onChangeText={(postcodeArea) => setListingForm((v) => ({ ...v, postcodeArea }))}
              placeholder="Postcode area"
            />
            <TextInput
              style={styles.input}
              value={listingForm.rentPcm}
              onChangeText={(rentPcm) => setListingForm((v) => ({ ...v, rentPcm }))}
              placeholder="Rent pcm"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={listingForm.availableFrom}
              onChangeText={(availableFrom) => setListingForm((v) => ({ ...v, availableFrom }))}
              placeholder="Available from YYYY-MM-DD"
            />
            <TextInput
              style={styles.input}
              value={listingForm.roomType}
              onChangeText={(roomType) => setListingForm((v) => ({ ...v, roomType }))}
              placeholder="Room type"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={listingForm.description}
              onChangeText={(description) => setListingForm((v) => ({ ...v, description }))}
              placeholder="Description"
            />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Bills included</Text>
              <Switch
                value={listingForm.billsIncluded}
                onValueChange={(billsIncluded) => setListingForm((v) => ({ ...v, billsIncluded }))}
              />
            </View>
            <Pressable onPress={onCreateListing} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Post listing</Text>
            </Pressable>

            {listings.map((listing) => (
              <View key={listing.listingId} style={styles.listingItem}>
                <Text style={styles.cardTitle}>{listing.title}</Text>
                <Text style={styles.cardLine}>{listing.borough} · £{listing.rentPcm}</Text>
                <Text style={styles.cardLine}>{listing.roomType} · {listing.postcodeArea}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tab === "matches" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Mutual likes</Text>
            {matches.length === 0 ? <Text style={styles.cardLine}>No matches yet.</Text> : null}
            {matches.map((match) => (
              <View key={match.userId} style={styles.matchItem}>
                <Text style={styles.cardTitle}>{match.name}</Text>
                <Text style={styles.cardLine}>{match.university} · {match.preferredBorough}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef4ec"
  },
  scrollContainer: {
    padding: 16,
    gap: 12
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#4d5f4f",
    fontWeight: "700",
    fontFamily: "Georgia"
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#17210f",
    fontFamily: "Georgia"
  },
  status: {
    color: "#2b5138"
  },
  panel: {
    backgroundColor: "#fffef9",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#d3ddcd"
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1d2a21",
    fontFamily: "Georgia"
  },
  fieldBlock: {
    gap: 6
  },
  label: {
    color: "#4f5f53",
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ced8c7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff"
  },
  textArea: {
    minHeight: 74,
    textAlignVertical: "top"
  },
  inlineFields: {
    flexDirection: "row",
    gap: 8
  },
  half: {
    flex: 1
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cad4c4",
    backgroundColor: "#f5f8f2"
  },
  chipActive: {
    backgroundColor: "#196244",
    borderColor: "#196244"
  },
  chipText: {
    color: "#3d4c3e",
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#edf7f0"
  },
  primaryButton: {
    backgroundColor: "#196244",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonSmall: {
    backgroundColor: "#196244",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10
  },
  primaryButtonText: {
    color: "#edf7f1",
    fontWeight: "700"
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: "#c5d0bf",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f5f8f2"
  },
  tabBar: {
    flexDirection: "row",
    gap: 8
  },
  tabItem: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd8ca",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f8fbf6"
  },
  tabItemActive: {
    backgroundColor: "#ecf6f2",
    borderColor: "#2a7759"
  },
  tabText: {
    color: "#4b5a4e",
    fontWeight: "700"
  },
  tabTextActive: {
    color: "#16543b"
  },
  card: {
    borderWidth: 1,
    borderColor: "#d0d9ce",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f9fcf8",
    gap: 4
  },
  compat: {
    color: "#bd5d28",
    fontWeight: "700"
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 17,
    color: "#203021"
  },
  cardLine: {
    color: "#4a594e"
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8
  },
  listingItem: {
    borderTopWidth: 1,
    borderTopColor: "#dee8d9",
    paddingTop: 8,
    gap: 2
  },
  matchItem: {
    borderTopWidth: 1,
    borderTopColor: "#dde7d8",
    paddingTop: 8,
    gap: 2
  }
});
