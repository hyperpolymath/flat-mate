<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# POST-audit status report
Repo: flat-mate
Actions taken:
- Added TS blocker workflow
- Added NPM/Bun blocker workflow
- Managed lockfiles
- Synced repo (Dependabot, .scm, Justfile)
Remaining findings: {
  "program_path": ".",
  "language": "javascript",
  "frameworks": [],
  "weak_points": [
    {
      "category": "InputBoundary",
      "location": "apps/api/src/verisimClient.ts",
      "file": "apps/api/src/verisimClient.ts",
      "severity": "Medium",
      "description": "1 JSON.parse call(s) with 0 try block(s) in apps/api/src/verisimClient.ts — JSON.parse throws SyntaxError on malformed input; wrap in try-catch",
      "recommended_attack": [
        "cpu"
      ]
    },
    {
      "category": "SupplyChain",
      "location": "flake.nix",
      "file": "flake.nix",
      "severity": "High",
      "description": "flake.nix declares inputs without narHash, rev pinning, or sibling flake.lock — dependency revision is unpinned in flake.nix",
      "recommended_attack": []
    }
  ],
  "statistics": {
    "total_lines": 2263,
    "unsafe_blocks": 0,
    "panic_sites": 0,
    "unwrap_calls": 0,
    "allocation_sites": 0,
    "io_operations": 5,
    "threading_constructs": 0
  },
  "file_statistics": [
    {
      "file_path": "apps/api/src/verisimClient.ts",
      "lines": 50,
      "unsafe_blocks": 0,
      "panic_sites": 0,
      "unwrap_calls": 0,
      "allocation_sites": 0,
      "io_operations": 1,
      "threading_constructs": 0
    },
    {
      "file_path": "apps/web/src/api.js",
      "lines": 43,
      "unsafe_blocks": 0,
      "panic_sites": 0,
      "unwrap_calls": 0,
      "allocation_sites": 0,
      "io_operations": 1,
      "threading_constructs": 0
    },
    {
      "file_path": "apps/mobile/src/api.js",
      "lines": 42,
      "unsafe_blocks": 0,
      "panic_sites": 0,
      "unwrap_calls": 0,
      "allocation_sites": 0,
      "io_operations": 1,
      "threading_constructs": 0
    },
    {
      "file_path": "flake.nix",
      "lines": 116,
      "unsafe_blocks": 0,
      "panic_sites": 0,
      "unwrap_calls": 0,
      "allocation_sites": 0,
      "io_operations": 2,
      "threading_constructs": 0
    }
  ],
  "recommended_attacks": [
    "cpu"
  ],
  "dependency_graph": {
    "edges": []
  },
  "taint_matrix": {
    "rows": [
      {
        "source_category": "InputBoundary",
        "sink_axis": "cpu",
        "severity_value": 2.5,
        "files": [
          "apps/api/src/verisimClient.ts"
        ],
        "frameworks": [],
        "relation": "InputBoundary->Cpu"
      }
    ]
  }
}
CRG Grade: D
