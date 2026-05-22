// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Expo entry point. Registers the root App component with the native runtime.

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
