export type LegalInline = {
  text: string;
  bold?: boolean;
};

export type LegalBlock =
  | { type: "eyebrow" | "title" | "heading" | "subheading" | "paragraph"; content: LegalInline[] }
  | { type: "lines"; lines: LegalInline[][] }
  | { type: "list"; items: LegalInline[][] }
  | { type: "symbolList"; symbol: string; items: LegalInline[][] };

export type LegalPageContent = {
  route: string;
  label: string;
  blocks: LegalBlock[];
};

export const termsOfUseContent = {
  "route": "/terms-of-use",
  "label": "Terms of Use / Platform Terms",
  "blocks": [
    {
      "type": "eyebrow",
      "content": [
        {
          "text": "Terms of Use / Platform Terms",
          "bold": true
        }
      ]
    },
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – TERMS OF USE",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "License Number:",
            "bold": true
          },
          {
            "text": " 1249299"
          }
        ],
        [
          {
            "text": "Commercial Registration Number:",
            "bold": true
          },
          {
            "text": " 2203902"
          }
        ],
        [
          {
            "text": "DCCI Number:",
            "bold": true
          },
          {
            "text": " 492118"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Welcome to "
        },
        {
          "text": "DXB Deal Flow (“Platform”)",
          "bold": true
        },
        {
          "text": ", a private digital marketplace and communication platform designed to connect "
        },
        {
          "text": "licensed real estate brokers, verified investors, and strategic real estate partners",
          "bold": true
        },
        {
          "text": " operating within the Dubai and wider UAE property market."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is owned and operated by "
        },
        {
          "text": "Veer & Sant Real Estate L.L.C (“DXB Deal Flow”, “we”, “our”, “us”)",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By registering, accessing, browsing, or using DXB Deal Flow, you agree to comply with and be legally bound by these "
        },
        {
          "text": "Terms of Use (“Terms”)",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "If you do not agree with these Terms, you must not use the Platform."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. PURPOSE OF THE PLATFORM",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow exists to facilitate:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Broker-to-broker deal collaboration"
          }
        ],
        [
          {
            "text": "Access to off-market and distressed opportunities"
          }
        ],
        [
          {
            "text": "Buyer requirement matching"
          }
        ],
        [
          {
            "text": "Property deal communication"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Strategic partnerships within the property ecosystem"
          }
        ],
        [
          {
            "text": "Curated investment opportunities for approved users"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is "
        },
        {
          "text": "not a real estate brokerage marketplace open to the public",
          "bold": true
        },
        {
          "text": " and access is subject to approval and verification."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We reserve the right to restrict, suspend, or revoke access at our sole discretion."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. USER TYPES & ELIGIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The Platform is intended for approved professional participants only."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may apply under one of the following categories:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "A. Licensed Real Estate Brokers",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Licensed property professionals operating within Dubai, UAE or approved international jurisdictions."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Broker users may be required to provide:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Full legal name"
          }
        ],
        [
          {
            "text": "Broker Number (BRN / RERA)"
          }
        ],
        [
          {
            "text": "Company / Agency information"
          }
        ],
        [
          {
            "text": "Registered email"
          }
        ],
        [
          {
            "text": "WhatsApp contact details"
          }
        ],
        [
          {
            "text": "Identification or supporting documentation"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Broker accounts may receive "
        },
        {
          "text": "full access privileges",
          "bold": true
        },
        {
          "text": " subject to approval."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "B. Verified Investors",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Private investors, family offices, high-net-worth individuals, or institutional investment representatives."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor users may be granted "
        },
        {
          "text": "restricted access",
          "bold": true
        },
        {
          "text": " to selected platform functionality."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor users may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Browse approved listings"
          }
        ],
        [
          {
            "text": "Submit enquiries"
          }
        ],
        [
          {
            "text": "Access selected opportunities"
          }
        ],
        [
          {
            "text": "Save listings"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Connect through platform-approved contact methods"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor users shall "
        },
        {
          "text": "not receive unrestricted access to broker-only functionality",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "C. Strategic Partners",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Professionals supporting the property ecosystem, including but not limited to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Mortgage brokers"
          }
        ],
        [
          {
            "text": "Conveyancers"
          }
        ],
        [
          {
            "text": "Lawyers"
          }
        ],
        [
          {
            "text": "Developers"
          }
        ],
        [
          {
            "text": "Golden Visa specialists"
          }
        ],
        [
          {
            "text": "Wealth advisors"
          }
        ],
        [
          {
            "text": "Investment consultants"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Strategic partner permissions may vary depending on approval status."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. ACCOUNT VERIFICATION & MEMBERSHIP",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow operates a "
        },
        {
          "text": "verification-first access model",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Registration does not guarantee approval."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All applications are subject to:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Automated Verification",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where available, DXB Deal Flow may verify:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Broker name"
          }
        ],
        [
          {
            "text": "BRN / RERA number"
          }
        ],
        [
          {
            "text": "Registered email"
          }
        ],
        [
          {
            "text": "Agency affiliation"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Manual Review",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Applications may be manually reviewed where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "information cannot be verified"
          }
        ],
        [
          {
            "text": "inconsistencies exist"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "supporting documents are required"
          }
        ],
        [
          {
            "text": "access type requires additional due diligence"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We reserve the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "approve"
          }
        ],
        [
          {
            "text": "reject"
          }
        ],
        [
          {
            "text": "suspend"
          }
        ],
        [
          {
            "text": "restrict"
          }
        ],
        [
          {
            "text": "revoke"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "any account application at our sole discretion without obligation to provide detailed reasoning."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approval to access the Platform does not constitute endorsement, licensing, regulatory approval, or recommendation."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. ACCOUNT RESPONSIBILITIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "You are responsible for:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Accuracy of Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All information submitted must be:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "truthful"
          }
        ],
        [
          {
            "text": "accurate"
          }
        ],
        [
          {
            "text": "current"
          }
        ],
        [
          {
            "text": "not misleading"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "You must promptly update changes to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker status"
          }
        ],
        [
          {
            "text": "employer"
          }
        ],
        [
          {
            "text": "licensing"
          }
        ],
        [
          {
            "text": "email"
          }
        ],
        [
          {
            "text": "contact information"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Account Security",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "You are responsible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "maintaining password confidentiality"
          }
        ],
        [
          {
            "text": "restricting account access"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "protecting login credentials"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "You must notify us immediately if:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "your account is compromised"
          }
        ],
        [
          {
            "text": "unauthorised access occurs"
          }
        ],
        [
          {
            "text": "credentials are misused"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for losses caused by unauthorised account usage."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "One User = One Account",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "create fake identities"
          }
        ],
        [
          {
            "text": "impersonate others"
          }
        ],
        [
          {
            "text": "create duplicate broker accounts"
          }
        ],
        [
          {
            "text": "misrepresent agency relationships"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "False accounts may result in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "immediate suspension"
          }
        ],
        [
          {
            "text": "permanent removal"
          }
        ],
        [
          {
            "text": "blacklisting from future access"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Professional Conduct",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All users agree to behave professionally."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "harass other users"
          }
        ],
        [
          {
            "text": "spam brokers"
          }
        ],
        [
          {
            "text": "abuse messaging"
          }
        ],
        [
          {
            "text": "manipulate listings"
          }
        ],
        [
          {
            "text": "misrepresent opportunities"
          }
        ],
        [
          {
            "text": "engage in unethical conduct"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to suspend users for behaviour deemed harmful to the platform or community."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "6. PLATFORM ACCESS RIGHTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Access levels may differ depending on:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "account type"
          }
        ],
        [
          {
            "text": "verification level"
          }
        ],
        [
          {
            "text": "membership status"
          }
        ],
        [
          {
            "text": "broker standing"
          }
        ],
        [
          {
            "text": "internal moderation decisions"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the unrestricted right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "limit functionality"
          }
        ],
        [
          {
            "text": "modify permissions"
          }
        ],
        [
          {
            "text": "introduce subscription levels"
          }
        ],
        [
          {
            "text": "restrict access to certain opportunities"
          }
        ],
        [
          {
            "text": "prioritise verified members"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "without prior notice."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. LISTINGS & INVENTORY RULES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow permits approved users to upload and share property-related opportunities, including but not limited to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Off-market properties"
          }
        ],
        [
          {
            "text": "Distressed opportunities"
          }
        ],
        [
          {
            "text": "Urgent sale inventory"
          }
        ],
        [
          {
            "text": "Developer stock"
          }
        ],
        [
          {
            "text": "Exclusive allocations"
          }
        ],
        [
          {
            "text": "Pocket listings"
          }
        ],
        [
          {
            "text": "Investment opportunities"
          }
        ],
        [
          {
            "text": "Buyer requirements"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All listings must be submitted honestly, professionally, and in good faith."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By uploading a listing, you confirm that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "you have authority to market the opportunity;"
          }
        ],
        [
          {
            "text": "you reasonably believe the information is accurate;"
          }
        ],
        [
          {
            "text": "the listing is current and available at the time of upload;"
          }
        ],
        [
          {
            "text": "the pricing and details are not intentionally misleading;"
          }
        ],
        [
          {
            "text": "any claimed discounts or “below market” positioning are reasonably supportable."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Prohibited Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not upload:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "False or Misleading Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fake listings"
          }
        ],
        [
          {
            "text": "unavailable stock"
          }
        ],
        [
          {
            "text": "sold units presented as active"
          }
        ],
        [
          {
            "text": "misleading distress claims"
          }
        ],
        [
          {
            "text": "inaccurate pricing"
          }
        ],
        [
          {
            "text": "fabricated ROI figures"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Duplicate or Spam Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated submissions intended to manipulate visibility or overwhelm users."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Confidential Materials",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not upload:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "confidential owner information"
          }
        ],
        [
          {
            "text": "private agreements"
          }
        ],
        [
          {
            "text": "passport copies"
          }
        ],
        [
          {
            "text": "title deeds without consent"
          }
        ],
        [
          {
            "text": "financial documentation without permission"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Unauthorised Marketing",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Listings uploaded without permission or mandate from the relevant party may be removed."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Quality Standards",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may apply listing quality standards including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "required images"
          }
        ],
        [
          {
            "text": "descriptions"
          }
        ],
        [
          {
            "text": "location details"
          }
        ],
        [
          {
            "text": "pricing accuracy"
          }
        ],
        [
          {
            "text": "supporting documentation"
          }
        ],
        [
          {
            "text": "completeness score"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Incomplete or low-quality listings may receive reduced visibility or be rejected."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Approval",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Listings may move through stages including:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Pending → Approved → Live → Expired → Removed",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "approve listings"
          }
        ],
        [
          {
            "text": "reject listings"
          }
        ],
        [
          {
            "text": "request amendments"
          }
        ],
        [
          {
            "text": "suspend visibility"
          }
        ],
        [
          {
            "text": "remove listings entirely"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "without notice where necessary."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approval does not constitute verification, endorsement, or validation of the opportunity."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The listing owner remains fully responsible for its accuracy."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. BUYER REQUIREMENTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Verified users may post buyer requirements for the purpose of sourcing matching opportunities."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Buyer requirements may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "target locations"
          }
        ],
        [
          {
            "text": "budget ranges"
          }
        ],
        [
          {
            "text": "property type"
          }
        ],
        [
          {
            "text": "financing position"
          }
        ],
        [
          {
            "text": "urgency level"
          }
        ],
        [
          {
            "text": "investment criteria"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users agree that buyer requirements:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "must be genuine;"
          }
        ],
        [
          {
            "text": "must not be misleading;"
          }
        ],
        [
          {
            "text": "must represent real client demand where stated."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Fake buyer mandates, fabricated demand, or misleading enquiries may result in suspension."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may limit visibility or remove requirements deemed:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "inaccurate"
          }
        ],
        [
          {
            "text": "misleading"
          }
        ],
        [
          {
            "text": "duplicate"
          }
        ],
        [
          {
            "text": "low quality"
          }
        ],
        [
          {
            "text": "spam-related"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain responsible for their own client relationships and transactions."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. MESSAGING & COMMUNICATION RULES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow includes broker communication and messaging functionality."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users agree to use messaging professionally and responsibly."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Acceptable Communication",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "discuss opportunities;"
          }
        ],
        [
          {
            "text": "arrange meetings;"
          }
        ],
        [
          {
            "text": "request documentation;"
          }
        ],
        [
          {
            "text": "negotiate co-broke arrangements;"
          }
        ],
        [
          {
            "text": "communicate regarding listings and requirements."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Prohibited Conduct",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Spam Other Users",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "mass unsolicited messages;"
          }
        ],
        [
          {
            "text": "repetitive outreach;"
          }
        ],
        [
          {
            "text": "excessive promotional activity."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Harassment or Abuse",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "threats"
          }
        ],
        [
          {
            "text": "offensive language"
          }
        ],
        [
          {
            "text": "intimidation"
          }
        ],
        [
          {
            "text": "discrimination"
          }
        ],
        [
          {
            "text": "abusive behaviour"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Circumvention Abuse",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Using platform messaging solely to harvest contacts or bypass intended workflows in bad faith."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Misrepresentation",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not falsely represent:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "ownership"
          }
        ],
        [
          {
            "text": "mandates"
          }
        ],
        [
          {
            "text": "agency authority"
          }
        ],
        [
          {
            "text": "exclusivity"
          }
        ],
        [
          {
            "text": "pricing"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Monitoring & Moderation",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "monitor platform activity;"
          }
        ],
        [
          {
            "text": "investigate misuse;"
          }
        ],
        [
          {
            "text": "review complaints;"
          }
        ],
        [
          {
            "text": "restrict communication privileges;"
          }
        ],
        [
          {
            "text": "suspend messaging access."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Private communications may be reviewed where required for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fraud prevention;"
          }
        ],
        [
          {
            "text": "compliance;"
          }
        ],
        [
          {
            "text": "dispute investigation;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "platform protection."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Response Expectations",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "response times;"
          }
        ],
        [
          {
            "text": "broker engagement;"
          }
        ],
        [
          {
            "text": "transaction outcomes;"
          }
        ],
        [
          {
            "text": "communication success."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain solely responsible for their own negotiations and relationships."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. INVESTOR ACCESS RESTRICTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Verified investors may be granted limited platform access."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor users acknowledge that DXB Deal Flow is primarily a professional broker ecosystem."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "As such, certain broker-only functionality may remain restricted."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Investor Users May Not",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Without permission:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "access broker-only inventory;"
          }
        ],
        [
          {
            "text": "view protected broker information;"
          }
        ],
        [
          {
            "text": "scrape contact details;"
          }
        ],
        [
          {
            "text": "directly market services to brokers;"
          }
        ],
        [
          {
            "text": "post broker inventory;"
          }
        ],
        [
          {
            "text": "access internal broker discussions;"
          }
        ],
        [
          {
            "text": "interfere in broker-to-broker negotiations."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Broker Protection",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Certain information may remain hidden from investors including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker full names;"
          }
        ],
        [
          {
            "text": "agency details;"
          }
        ],
        [
          {
            "text": "internal notes;"
          }
        ],
        [
          {
            "text": "sensitive pricing discussions;"
          }
        ],
        [
          {
            "text": "co-broke arrangements;"
          }
        ],
        [
          {
            "text": "broker communications."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to gate, limit, or restrict information for platform integrity."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Circumvention of Brokers",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investors agree not to intentionally bypass brokers introduced via DXB Deal Flow."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Attempts to avoid broker representation or undermine broker relationships may result in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "suspension;"
          }
        ],
        [
          {
            "text": "permanent removal;"
          }
        ],
        [
          {
            "text": "restricted future access."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. NON-CIRCUMVENTION & BROKER RESPECT POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is built upon broker trust."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users agree not to misuse information obtained through the Platform to bypass legitimate relationships."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users shall not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "intentionally bypass introducing brokers;"
          }
        ],
        [
          {
            "text": "avoid agreed co-broke arrangements;"
          }
        ],
        [
          {
            "text": "contact owners directly using platform information;"
          }
        ],
        [
          {
            "text": "misuse confidential listing details;"
          }
        ],
        [
          {
            "text": "exploit relationships unfairly."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Broker Introductions",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where a broker introduces:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "a listing"
          }
        ],
        [
          {
            "text": "an owner"
          }
        ],
        [
          {
            "text": "an opportunity"
          }
        ],
        [
          {
            "text": "a developer allocation"
          }
        ],
        [
          {
            "text": "an investment lead"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "other users agree to act in good faith."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Position",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow encourages ethical collaboration but:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not enforce private commission arrangements between users.",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Any co-broke terms remain the responsibility of participating parties."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Breach of Trust",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where credible evidence exists that a user has intentionally circumvented another party:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "investigate;"
          }
        ],
        [
          {
            "text": "suspend access;"
          }
        ],
        [
          {
            "text": "restrict functionality;"
          }
        ],
        [
          {
            "text": "permanently ban users."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform trust takes priority."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. CO-BROKE & COMMISSION DISCLAIMER",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a technology platform only."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "is not a brokerage intermediary;"
          }
        ],
        [
          {
            "text": "is not party to any transaction;"
          }
        ],
        [
          {
            "text": "does not negotiate commissions;"
          }
        ],
        [
          {
            "text": "does not enforce co-broke agreements;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "does not guarantee payment."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Independent Agreements",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All commission arrangements are strictly between participating users."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are solely responsible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "written agreements;"
          }
        ],
        [
          {
            "text": "fee negotiations;"
          }
        ],
        [
          {
            "text": "commission structures;"
          }
        ],
        [
          {
            "text": "payment terms;"
          }
        ],
        [
          {
            "text": "legal enforceability."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Liability",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "unpaid commissions;"
          }
        ],
        [
          {
            "text": "commission disputes;"
          }
        ],
        [
          {
            "text": "deal failures;"
          }
        ],
        [
          {
            "text": "broker disagreements;"
          }
        ],
        [
          {
            "text": "financial losses;"
          }
        ],
        [
          {
            "text": "transaction disputes."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users participate at their own risk."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Recommendation",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are encouraged to document all co-broke arrangements in writing prior to proceeding with any transaction."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. MODERATION & PLATFORM RIGHTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a curated and moderated platform."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To maintain quality, trust, and professional standards, DXB Deal Flow reserves full discretion to moderate platform activity."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "review listings;"
          }
        ],
        [
          {
            "text": "approve or reject content;"
          }
        ],
        [
          {
            "text": "limit listing visibility;"
          }
        ],
        [
          {
            "text": "remove duplicate inventory;"
          }
        ],
        [
          {
            "text": "restrict user permissions;"
          }
        ],
        [
          {
            "text": "investigate suspicious behaviour;"
          }
        ],
        [
          {
            "text": "suspend accounts;"
          }
        ],
        [
          {
            "text": "permanently terminate access."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Reasons for Moderation",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Content or users may be moderated where there is reason to believe:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Issues",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "false listings;"
          }
        ],
        [
          {
            "text": "duplicate inventory;"
          }
        ],
        [
          {
            "text": "misleading pricing;"
          }
        ],
        [
          {
            "text": "unsupported claims;"
          }
        ],
        [
          {
            "text": "outdated opportunities;"
          }
        ],
        [
          {
            "text": "spam content;"
          }
        ],
        [
          {
            "text": "poor quality submissions."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Behavioural Issues",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker harassment;"
          }
        ],
        [
          {
            "text": "unethical conduct;"
          }
        ],
        [
          {
            "text": "abusive messaging;"
          }
        ],
        [
          {
            "text": "spam activity;"
          }
        ],
        [
          {
            "text": "solicitation abuse;"
          }
        ],
        [
          {
            "text": "manipulation of platform activity."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Verification Issues",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "inaccurate broker credentials;"
          }
        ],
        [
          {
            "text": "expired licenses;"
          }
        ],
        [
          {
            "text": "false identity claims;"
          }
        ],
        [
          {
            "text": "unverifiable information."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Visibility Controls",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may prioritise or limit visibility of:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "incomplete profiles;"
          }
        ],
        [
          {
            "text": "low-quality listings;"
          }
        ],
        [
          {
            "text": "inactive users;"
          }
        ],
        [
          {
            "text": "newly approved members;"
          }
        ],
        [
          {
            "text": "premium members (where applicable)."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to introduce ranking systems, priority placement, subscription tiers, or visibility adjustments at its discretion."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Obligation to Publish",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Submission of content does not guarantee publication."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the unrestricted right to reject any content."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. INTELLECTUAL PROPERTY & CONTENT OWNERSHIP",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users retain ownership of content they upload to DXB Deal Flow."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This includes:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "photographs;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "floorplans;"
          }
        ],
        [
          {
            "text": "renders;"
          }
        ],
        [
          {
            "text": "videos;"
          }
        ],
        [
          {
            "text": "descriptions;"
          }
        ],
        [
          {
            "text": "marketing materials."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Usage Licence",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By uploading content, users grant DXB Deal Flow a non-exclusive licence to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "display;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "reproduce;"
          }
        ],
        [
          {
            "text": "distribute;"
          }
        ],
        [
          {
            "text": "optimise;"
          }
        ],
        [
          {
            "text": "resize;"
          }
        ],
        [
          {
            "text": "feature"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "such content for platform functionality, promotion, marketing, moderation, and operational purposes."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This licence continues for as long as content remains active on the Platform."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "User Responsibility",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users confirm they have the lawful right to upload any material submitted."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not upload:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "copyrighted material without permission;"
          }
        ],
        [
          {
            "text": "stolen content;"
          }
        ],
        [
          {
            "text": "misleading developer branding;"
          }
        ],
        [
          {
            "text": "third-party confidential materials."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain solely liable for infringement claims."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Branding",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All DXB Deal Flow branding, including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "logos;"
          }
        ],
        [
          {
            "text": "design systems;"
          }
        ],
        [
          {
            "text": "functionality;"
          }
        ],
        [
          {
            "text": "workflows;"
          }
        ],
        [
          {
            "text": "written copy;"
          }
        ],
        [
          {
            "text": "UI/UX elements"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "remain the intellectual property of DXB Deal Flow and Veer & Sant Real Estate L.L.C."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Unauthorised copying, scraping, or replication is prohibited."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "15. LIABILITY DISCLAIMER",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow acts solely as a technology platform facilitating introductions, communication, and listing visibility."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is "
        },
        {
          "text": "not",
          "bold": true
        },
        {
          "text": ":"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "a broker in your transaction;"
          }
        ],
        [
          {
            "text": "a buyer representative;"
          }
        ],
        [
          {
            "text": "a seller representative;"
          }
        ],
        [
          {
            "text": "a legal advisor;"
          }
        ],
        [
          {
            "text": "a financial advisor;"
          }
        ],
        [
          {
            "text": "an escrow provider;"
          }
        ],
        [
          {
            "text": "a guarantor of information."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Transaction Liability",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "failed transactions;"
          }
        ],
        [
          {
            "text": "inaccurate listings;"
          }
        ],
        [
          {
            "text": "financial loss;"
          }
        ],
        [
          {
            "text": "misrepresentation;"
          }
        ],
        [
          {
            "text": "lost opportunities;"
          }
        ],
        [
          {
            "text": "delayed transactions;"
          }
        ],
        [
          {
            "text": "developer changes;"
          }
        ],
        [
          {
            "text": "investment performance;"
          }
        ],
        [
          {
            "text": "pricing discrepancies;"
          }
        ],
        [
          {
            "text": "broker conduct."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users engage with opportunities entirely at their own risk."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Guarantee of Accuracy",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "While moderation measures may be applied:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not warrant that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "listings are accurate;"
          }
        ],
        [
          {
            "text": "pricing is correct;"
          }
        ],
        [
          {
            "text": "opportunities remain available;"
          }
        ],
        [
          {
            "text": "broker claims are valid;"
          }
        ],
        [
          {
            "text": "investment returns will occur."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are responsible for independent due diligence."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Investment Advice",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Nothing on DXB Deal Flow constitutes:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "legal advice;"
          }
        ],
        [
          {
            "text": "tax advice;"
          }
        ],
        [
          {
            "text": "investment advice;"
          }
        ],
        [
          {
            "text": "financial advice."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should seek independent professional guidance."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Service Availability",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "uninterrupted access;"
          }
        ],
        [
          {
            "text": "bug-free functionality;"
          }
        ],
        [
          {
            "text": "continuous uptime;"
          }
        ],
        [
          {
            "text": "error-free performance."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The platform is provided on an:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "“as available” and “as is” basis",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "16. INDEMNITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, users agree to indemnify and hold harmless:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Veer & Sant Real Estate L.L.C, DXB Deal Flow, directors, employees, contractors, affiliates, and partners",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "from any claim, dispute, damage, cost, liability, loss, or legal expense arising from:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "misuse of the platform;"
          }
        ],
        [
          {
            "text": "breach of these Terms;"
          }
        ],
        [
          {
            "text": "inaccurate listings;"
          }
        ],
        [
          {
            "text": "broker disputes;"
          }
        ],
        [
          {
            "text": "commission disputes;"
          }
        ],
        [
          {
            "text": "copyright claims;"
          }
        ],
        [
          {
            "text": "misleading information;"
          }
        ],
        [
          {
            "text": "unlawful conduct."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users agree to bear responsibility for their own activity."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "17. PRIVACY & DATA PROTECTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow collects and processes personal data for operational and verification purposes."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Data may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "names;"
          }
        ],
        [
          {
            "text": "email addresses;"
          }
        ],
        [
          {
            "text": "WhatsApp numbers;"
          }
        ],
        [
          {
            "text": "BRN / RERA information;"
          }
        ],
        [
          {
            "text": "agency information;"
          }
        ],
        [
          {
            "text": "social media handles;"
          }
        ],
        [
          {
            "text": "platform communications."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Use of Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Information may be used for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "account verification;"
          }
        ],
        [
          {
            "text": "communication;"
          }
        ],
        [
          {
            "text": "security;"
          }
        ],
        [
          {
            "text": "moderation;"
          }
        ],
        [
          {
            "text": "product improvements;"
          }
        ],
        [
          {
            "text": "marketing communications;"
          }
        ],
        [
          {
            "text": "platform optimisation."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Data Sharing",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not sell personal information."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However, data may be shared where necessary with:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "regulatory authorities;"
          }
        ],
        [
          {
            "text": "compliance providers;"
          }
        ],
        [
          {
            "text": "legal advisers;"
          }
        ],
        [
          {
            "text": "fraud prevention services."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Further information is outlined within the "
        },
        {
          "text": "Privacy Policy",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "18. MAINTENANCE, DOWNTIME & PLATFORM CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may periodically:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "update systems;"
          }
        ],
        [
          {
            "text": "perform maintenance;"
          }
        ],
        [
          {
            "text": "redesign functionality;"
          }
        ],
        [
          {
            "text": "suspend features;"
          }
        ],
        [
          {
            "text": "modify access."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Temporary interruptions may occur."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Liability for Downtime",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "missed opportunities;"
          }
        ],
        [
          {
            "text": "lost leads;"
          }
        ],
        [
          {
            "text": "interrupted access;"
          }
        ],
        [
          {
            "text": "delayed communication;"
          }
        ],
        [
          {
            "text": "technical failures."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Feature Changes",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We reserve the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "introduce subscriptions;"
          }
        ],
        [
          {
            "text": "add premium features;"
          }
        ],
        [
          {
            "text": "limit free access;"
          }
        ],
        [
          {
            "text": "modify workflows;"
          }
        ],
        [
          {
            "text": "alter user permissions"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "without prior notice."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "19. SUSPENSION & TERMINATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may suspend or terminate access immediately where users:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "breach these Terms;"
          }
        ],
        [
          {
            "text": "submit false information;"
          }
        ],
        [
          {
            "text": "abuse messaging;"
          }
        ],
        [
          {
            "text": "harass users;"
          }
        ],
        [
          {
            "text": "upload misleading listings;"
          }
        ],
        [
          {
            "text": "circumvent brokers;"
          }
        ],
        [
          {
            "text": "compromise trust within the platform."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Termination may occur:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "temporarily;"
          }
        ],
        [
          {
            "text": "permanently;"
          }
        ],
        [
          {
            "text": "without refund (where applicable)."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Account Removal",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may request account deletion by contacting:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may retain certain information where legally required or operationally necessary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "20. GOVERNING LAW & CONTACT INFORMATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "These Terms shall be governed by the laws of the:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "United Arab Emirates",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Any dispute arising from these Terms or Platform usage shall be subject to the exclusive jurisdiction of:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Dubai Courts, United Arab Emirates",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Contact Information",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "License No:",
            "bold": true
          },
          {
            "text": " 1249299"
          }
        ],
        [
          {
            "text": "Commercial Registration No:",
            "bold": true
          },
          {
            "text": " 2203902"
          }
        ],
        [
          {
            "text": "DCCI No:",
            "bold": true
          },
          {
            "text": " 492118"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support Email:",
          "bold": true
        },
        {
          "text": "  support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By registering, accessing, or using DXB Deal Flow, you acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "you have read these Terms;"
          }
        ],
        [
          {
            "text": "you understand them;"
          }
        ],
        [
          {
            "text": "you agree to be legally bound by them."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const privacyPolicyContent = {
  "route": "/privacy-policy",
  "label": "Privacy Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – PRIVACY POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "License Number:",
            "bold": true
          },
          {
            "text": " 1249299"
          }
        ],
        [
          {
            "text": "Commercial Registration Number:",
            "bold": true
          },
          {
            "text": " 2203902"
          }
        ],
        [
          {
            "text": "DCCI Number:",
            "bold": true
          },
          {
            "text": " 492118"
          }
        ],
        [
          {
            "text": "Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow (“Platform”, “we”, “our”, “us”) takes your privacy seriously."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Privacy Policy explains:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "what information we collect;"
          }
        ],
        [
          {
            "text": "how we use it;"
          }
        ],
        [
          {
            "text": "who we may share it with;"
          }
        ],
        [
          {
            "text": "how we store it;"
          }
        ],
        [
          {
            "text": "your rights regarding your information."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By accessing or using DXB Deal Flow, you consent to the practices described in this Privacy Policy."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "If you do not agree with this Privacy Policy, you should not use the Platform."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. WHO WE ARE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is operated by:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Veer & Sant Real Estate L.L.C",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "License No:",
            "bold": true
          },
          {
            "text": " 1249299"
          }
        ],
        [
          {
            "text": "Commercial Registration No:",
            "bold": true
          },
          {
            "text": " 2203902"
          }
        ],
        [
          {
            "text": "DCCI No:",
            "bold": true
          },
          {
            "text": " 492118"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "For privacy-related matters, please contact:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. INFORMATION WE COLLECT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We may collect personal, professional, and technical information."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "A. Identity Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "full name;"
          }
        ],
        [
          {
            "text": "email address;"
          }
        ],
        [
          {
            "text": "phone number;"
          }
        ],
        [
          {
            "text": "WhatsApp number;"
          }
        ],
        [
          {
            "text": "nationality (where applicable);"
          }
        ],
        [
          {
            "text": "profile image;"
          }
        ],
        [
          {
            "text": "biography information."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "B. Professional Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where relevant, including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Broker Number (BRN);"
          }
        ],
        [
          {
            "text": "RERA registration details;"
          }
        ],
        [
          {
            "text": "agency or company name;"
          }
        ],
        [
          {
            "text": "licence details;"
          }
        ],
        [
          {
            "text": "professional credentials;"
          }
        ],
        [
          {
            "text": "LinkedIn profile;"
          }
        ],
        [
          {
            "text": "Instagram handle."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "C. Account Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "login credentials;"
          }
        ],
        [
          {
            "text": "encrypted passwords;"
          }
        ],
        [
          {
            "text": "account preferences;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "notification settings."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "D. Listing & Content Data",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "uploaded listings;"
          }
        ],
        [
          {
            "text": "buyer requirements;"
          }
        ],
        [
          {
            "text": "descriptions;"
          }
        ],
        [
          {
            "text": "images;"
          }
        ],
        [
          {
            "text": "floorplans;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "videos;"
          }
        ],
        [
          {
            "text": "YouTube links;"
          }
        ],
        [
          {
            "text": "uploaded documentation."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "E. Messaging & Communication Data",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We may collect information related to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker messages;"
          }
        ],
        [
          {
            "text": "enquiries;"
          }
        ],
        [
          {
            "text": "communication history;"
          }
        ],
        [
          {
            "text": "support requests."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Private communications may be reviewed where reasonably necessary for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "compliance;"
          }
        ],
        [
          {
            "text": "fraud prevention;"
          }
        ],
        [
          {
            "text": "abuse investigation;"
          }
        ],
        [
          {
            "text": "platform moderation."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "F. Technical Data",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Automatically collected information may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "IP address;"
          }
        ],
        [
          {
            "text": "browser type;"
          }
        ],
        [
          {
            "text": "device type;"
          }
        ],
        [
          {
            "text": "location data (approximate);"
          }
        ],
        [
          {
            "text": "pages visited;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "session behaviour;"
          }
        ],
        [
          {
            "text": "platform activity."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "G. Marketing Data",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "email preferences;"
          }
        ],
        [
          {
            "text": "subscription status;"
          }
        ],
        [
          {
            "text": "campaign interactions;"
          }
        ],
        [
          {
            "text": "content engagement."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. HOW WE USE YOUR INFORMATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We use information to operate and improve DXB Deal Flow."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Purposes include:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Account Verification",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To verify:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker identity;"
          }
        ],
        [
          {
            "text": "BRN / RERA details;"
          }
        ],
        [
          {
            "text": "investor legitimacy;"
          }
        ],
        [
          {
            "text": "strategic partner eligibility."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Operations",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "provide access;"
          }
        ],
        [
          {
            "text": "manage listings;"
          }
        ],
        [
          {
            "text": "facilitate messaging;"
          }
        ],
        [
          {
            "text": "surface opportunities;"
          }
        ],
        [
          {
            "text": "match buyers and inventory."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Security & Fraud Prevention",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "prevent fake accounts;"
          }
        ],
        [
          {
            "text": "detect suspicious activity;"
          }
        ],
        [
          {
            "text": "investigate misuse;"
          }
        ],
        [
          {
            "text": "protect users."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Communication",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To send:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "account notifications;"
          }
        ],
        [
          {
            "text": "listing approvals;"
          }
        ],
        [
          {
            "text": "new deal alerts;"
          }
        ],
        [
          {
            "text": "message notifications;"
          }
        ],
        [
          {
            "text": "maintenance notices;"
          }
        ],
        [
          {
            "text": "onboarding emails;"
          }
        ],
        [
          {
            "text": "weekly digests;"
          }
        ],
        [
          {
            "text": "platform updates."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Marketing",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We may contact users regarding:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "new opportunities;"
          }
        ],
        [
          {
            "text": "feature launches;"
          }
        ],
        [
          {
            "text": "educational content;"
          }
        ],
        [
          {
            "text": "broker insights;"
          }
        ],
        [
          {
            "text": "DXB Deal Flow promotions."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may unsubscribe from marketing communications at any time."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Analytics & Improvements",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To improve:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "user experience;"
          }
        ],
        [
          {
            "text": "platform performance;"
          }
        ],
        [
          {
            "text": "listings quality;"
          }
        ],
        [
          {
            "text": "recommendation systems;"
          }
        ],
        [
          {
            "text": "matching accuracy."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. LEGAL BASIS FOR PROCESSING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We process information where necessary for:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Contractual Purposes",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To provide platform access and services."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Legitimate Business Interests",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To improve security, quality, and operations."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Legal Compliance",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where required by law or regulation."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Consent",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where you voluntarily provide information or marketing preferences."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. WHO WE MAY SHARE INFORMATION WITH",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does "
        },
        {
          "text": "not sell personal data",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However, we may share information with:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Service Providers",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "hosting providers;"
          }
        ],
        [
          {
            "text": "email systems;"
          }
        ],
        [
          {
            "text": "analytics providers;"
          }
        ],
        [
          {
            "text": "customer support systems;"
          }
        ],
        [
          {
            "text": "CRM systems."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Regulatory Authorities",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where legally required."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Dubai Land Department;"
          }
        ],
        [
          {
            "text": "RERA;"
          }
        ],
        [
          {
            "text": "UAE authorities;"
          }
        ],
        [
          {
            "text": "courts or regulators."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Legal & Compliance Advisors",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where reasonably necessary."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Fraud Prevention",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To protect users and platform integrity."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. PLATFORM VISIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Certain profile information may be visible to approved users."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Depending on account type, information shown may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "first name;"
          }
        ],
        [
          {
            "text": "profile image;"
          }
        ],
        [
          {
            "text": "agency;"
          }
        ],
        [
          {
            "text": "professional biography;"
          }
        ],
        [
          {
            "text": "listing ownership."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Broker contact details may be restricted depending on platform rules."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor access may be limited."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to limit visibility to protect brokers and platform integrity."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. SOCIAL MEDIA & FOUNDING MEMBER FEATURES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users who voluntarily provide:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Instagram handles;"
          }
        ],
        [
          {
            "text": "LinkedIn profiles;"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "may be eligible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "founding member features;"
          }
        ],
        [
          {
            "text": "social media mentions;"
          }
        ],
        [
          {
            "text": "promotional recognition."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Participation is voluntary."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may request removal at any time."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. DATA RETENTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We retain information only as long as reasonably necessary."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "active account duration;"
          }
        ],
        [
          {
            "text": "regulatory requirements;"
          }
        ],
        [
          {
            "text": "dispute resolution;"
          }
        ],
        [
          {
            "text": "fraud prevention;"
          }
        ],
        [
          {
            "text": "operational needs."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Deleted accounts may have limited records retained for compliance or legal purposes."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. DATA SECURITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We implement reasonable measures to protect information."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "These may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "encryption;"
          }
        ],
        [
          {
            "text": "secure servers;"
          }
        ],
        [
          {
            "text": "access controls;"
          }
        ],
        [
          {
            "text": "monitoring systems;"
          }
        ],
        [
          {
            "text": "authentication protections."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No online platform can guarantee absolute security."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are responsible for safeguarding their login credentials."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. INTERNATIONAL USERS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may be accessed internationally."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using the Platform, users understand that information may be processed within the UAE or other jurisdictions used by trusted providers."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. YOUR RIGHTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Subject to applicable law, users may request:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "access to their data;"
          }
        ],
        [
          {
            "text": "correction of inaccurate information;"
          }
        ],
        [
          {
            "text": "deletion requests;"
          }
        ],
        [
          {
            "text": "restriction of processing;"
          }
        ],
        [
          {
            "text": "marketing opt-out."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Requests may be sent to:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. COOKIES & TRACKING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may use:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "cookies;"
          }
        ],
        [
          {
            "text": "analytics tools;"
          }
        ],
        [
          {
            "text": "Meta Pixel;"
          }
        ],
        [
          {
            "text": "Google Analytics;"
          }
        ],
        [
          {
            "text": "behavioural tracking."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This helps us:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "improve performance;"
          }
        ],
        [
          {
            "text": "understand user activity;"
          }
        ],
        [
          {
            "text": "optimise marketing."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may manage browser cookie settings at any time."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Further information appears in our "
        },
        {
          "text": "Cookie Policy",
          "bold": true
        },
        {
          "text": "."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. CHILDREN’S PRIVACY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is intended for adults and professionals only."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The Platform is not intended for users under 18 years old."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "15. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "We may update this Privacy Policy periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Changes may occur due to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "legal requirements;"
          }
        ],
        [
          {
            "text": "feature changes;"
          }
        ],
        [
          {
            "text": "business operations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Updated versions will be published on the Platform."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance of updated policies."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "16. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Privacy-related requests:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Operated by:"
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ],
        [
          {
            "text": "License No: 1249299"
          }
        ],
        [
          {
            "text": "Commercial Registration No: 2203902"
          }
        ],
        [
          {
            "text": "DCCI No: 492118"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, you acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "you have read this Privacy Policy;"
          }
        ],
        [
          {
            "text": "you understand it;"
          }
        ],
        [
          {
            "text": "you agree to the processing of your information as described."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const cookiePolicyContent = {
  "route": "/cookie-policy",
  "label": "Cookie Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – COOKIE POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow (“Platform”, “we”, “our”, “us”) uses cookies and similar technologies to improve platform performance, user experience, security, and marketing effectiveness."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Cookie Policy explains:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "what cookies are;"
          }
        ],
        [
          {
            "text": "how we use them;"
          }
        ],
        [
          {
            "text": "what types of cookies may be used;"
          }
        ],
        [
          {
            "text": "how users can manage preferences."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, users consent to the use of cookies as described in this Policy."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. WHAT ARE COOKIES?",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Cookies are small text files placed on your browser or device when visiting a website."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Cookies help websites:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "recognise users;"
          }
        ],
        [
          {
            "text": "remember preferences;"
          }
        ],
        [
          {
            "text": "improve performance;"
          }
        ],
        [
          {
            "text": "analyse activity;"
          }
        ],
        [
          {
            "text": "enhance security."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Cookies do not typically identify users personally but may connect to profile information where appropriate."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. HOW DXB DEAL FLOW USES COOKIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow uses cookies to:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Maintain Secure Login Sessions",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Helping users stay signed in securely."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Improve User Experience",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Remembering:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "preferences;"
          }
        ],
        [
          {
            "text": "filters;"
          }
        ],
        [
          {
            "text": "settings;"
          }
        ],
        [
          {
            "text": "saved searches."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Performance",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Helping us understand:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "page performance;"
          }
        ],
        [
          {
            "text": "user behaviour;"
          }
        ],
        [
          {
            "text": "platform bottlenecks;"
          }
        ],
        [
          {
            "text": "feature engagement."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Security",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Helping detect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "suspicious logins;"
          }
        ],
        [
          {
            "text": "unusual activity;"
          }
        ],
        [
          {
            "text": "fraud risks."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Marketing & Advertising",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Helping us:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "improve campaigns;"
          }
        ],
        [
          {
            "text": "measure ad performance;"
          }
        ],
        [
          {
            "text": "deliver relevant marketing;"
          }
        ],
        [
          {
            "text": "retarget visitors."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. TYPES OF COOKIES WE MAY USE",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "A. Essential Cookies",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "These are necessary for platform operation."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "login authentication;"
          }
        ],
        [
          {
            "text": "security sessions;"
          }
        ],
        [
          {
            "text": "account access;"
          }
        ],
        [
          {
            "text": "saved settings."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Without these cookies, certain platform functions may not work."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "B. Performance & Analytics Cookies",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Used to understand:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "page visits;"
          }
        ],
        [
          {
            "text": "behaviour patterns;"
          }
        ],
        [
          {
            "text": "feature engagement;"
          }
        ],
        [
          {
            "text": "traffic sources."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Google Analytics;"
          }
        ],
        [
          {
            "text": "behavioural tracking systems."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This helps us improve DXB Deal Flow."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "C. Functional Cookies",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Used to remember:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "preferences;"
          }
        ],
        [
          {
            "text": "notifications;"
          }
        ],
        [
          {
            "text": "search filters;"
          }
        ],
        [
          {
            "text": "dashboard settings."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "These improve usability."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "D. Marketing & Advertising Cookies",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may use marketing technologies to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "measure ad campaigns;"
          }
        ],
        [
          {
            "text": "improve targeting;"
          }
        ],
        [
          {
            "text": "show relevant content."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may include:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Meta Pixel (Facebook / Instagram)",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To measure:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "ad performance;"
          }
        ],
        [
          {
            "text": "conversion tracking;"
          }
        ],
        [
          {
            "text": "remarketing."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Google Advertising Tools",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "For:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "analytics;"
          }
        ],
        [
          {
            "text": "remarketing;"
          }
        ],
        [
          {
            "text": "performance tracking."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Third-Party Advertising Platforms",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Used to improve relevance and campaign effectiveness."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. THIRD-PARTY COOKIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Some cookies may be placed by trusted third-party providers."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "analytics providers;"
          }
        ],
        [
          {
            "text": "hosting providers;"
          }
        ],
        [
          {
            "text": "CRM systems;"
          }
        ],
        [
          {
            "text": "advertising platforms."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not control third-party cookie behaviour."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should review third-party privacy policies where appropriate."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. HOW TO MANAGE COOKIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may manage cookie preferences through browser settings."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Most browsers allow users to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "block cookies;"
          }
        ],
        [
          {
            "text": "remove cookies;"
          }
        ],
        [
          {
            "text": "restrict tracking;"
          }
        ],
        [
          {
            "text": "clear stored data."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Blocking cookies may reduce platform functionality."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Some features may not operate properly."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "login persistence;"
          }
        ],
        [
          {
            "text": "saved settings;"
          }
        ],
        [
          {
            "text": "dashboard experiences."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. DO NOT TRACK",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Some browsers offer:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "“Do Not Track” signals."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "At this time, DXB Deal Flow does not guarantee response to all such signals due to varying technology standards."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. COOKIE CONSENT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where legally required, DXB Deal Flow may request cookie consent via:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "cookie banners;"
          }
        ],
        [
          {
            "text": "consent pop-ups;"
          }
        ],
        [
          {
            "text": "settings preferences."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use of the Platform may constitute consent."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may update this Cookie Policy periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Updates may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "technology changes;"
          }
        ],
        [
          {
            "text": "marketing tools;"
          }
        ],
        [
          {
            "text": "legal requirements;"
          }
        ],
        [
          {
            "text": "platform updates."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Updated versions will be posted on the Platform."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "License No:",
            "bold": true
          },
          {
            "text": " 1249299"
          }
        ],
        [
          {
            "text": "Commercial Registration No:",
            "bold": true
          },
          {
            "text": " 2203902"
          }
        ],
        [
          {
            "text": "DCCI No:",
            "bold": true
          },
          {
            "text": " 492118"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": "  support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By continuing to use DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "cookies may be used;"
          }
        ],
        [
          {
            "text": "preferences may be remembered;"
          }
        ],
        [
          {
            "text": "analytics and marketing technologies may operate as described."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const disclaimerContent = {
  "route": "/disclaimer",
  "label": "Investment & Market Disclaimer",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – INVESTMENT & MARKET DISCLAIMER",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow provides access to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "property listings;"
          }
        ],
        [
          {
            "text": "market commentary;"
          }
        ],
        [
          {
            "text": "investment opportunities;"
          }
        ],
        [
          {
            "text": "projected yields;"
          }
        ],
        [
          {
            "text": "estimated ROI;"
          }
        ],
        [
          {
            "text": "market observations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All information is provided for:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "general informational purposes only",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "and should not be relied upon as professional advice."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. NO FINANCIAL ADVICE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not provide:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "financial advice"
          }
        ],
        [
          {
            "text": "investment advice"
          }
        ],
        [
          {
            "text": "tax advice"
          }
        ],
        [
          {
            "text": "legal advice"
          }
        ],
        [
          {
            "text": "mortgage advice"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Nothing on the Platform constitutes a recommendation to buy, sell, or invest."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should seek independent professional advice."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. ROI, YIELDS & PROJECTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Figures relating to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "rental yields;"
          }
        ],
        [
          {
            "text": "ROI;"
          }
        ],
        [
          {
            "text": "appreciation;"
          }
        ],
        [
          {
            "text": "capital growth;"
          }
        ],
        [
          {
            "text": "occupancy assumptions;"
          }
        ],
        [
          {
            "text": "cashflow"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "are estimates only."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "projected  estimated  indicative  anticipated"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Past performance does not guarantee future performance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. BELOW MARKET & DISTRESSED CLAIMS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Terms such as:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "below market;"
          }
        ],
        [
          {
            "text": "distressed;"
          }
        ],
        [
          {
            "text": "motivated seller;"
          }
        ],
        [
          {
            "text": "opportunity pricing"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "reflect broker representations and market opinion."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "discounts;"
          }
        ],
        [
          {
            "text": "profitability;"
          }
        ],
        [
          {
            "text": "resale gains."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Independent due diligence is required."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. OFF-PLAN PROPERTY RISKS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Off-plan investments involve risk."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "delivery delays;"
          }
        ],
        [
          {
            "text": "market changes;"
          }
        ],
        [
          {
            "text": "developer revisions;"
          }
        ],
        [
          {
            "text": "financing changes;"
          }
        ],
        [
          {
            "text": "resale uncertainty."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users invest at their own risk."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. MARKET INFORMATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Market information may become outdated."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee ongoing accuracy."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. LIABILITY DISCLAIMER",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "investment losses;"
          }
        ],
        [
          {
            "text": "missed opportunities;"
          }
        ],
        [
          {
            "text": "valuation changes;"
          }
        ],
        [
          {
            "text": "market declines."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users make independent decisions."
        }
      ]
    }
  ]
} satisfies LegalPageContent;

export const refundPolicyContent = {
  "route": "/refund-policy",
  "label": "Refund / Subscription Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – REFUND & SUBSCRIPTION POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may introduce paid features including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "premium subscriptions;"
          }
        ],
        [
          {
            "text": "featured listings;"
          }
        ],
        [
          {
            "text": "boosted visibility;"
          }
        ],
        [
          {
            "text": "priority placement;"
          }
        ],
        [
          {
            "text": "advanced tools."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy explains:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "payments;"
          }
        ],
        [
          {
            "text": "renewals;"
          }
        ],
        [
          {
            "text": "cancellations;"
          }
        ],
        [
          {
            "text": "refunds."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. SUBSCRIPTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Subscriptions may operate on:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "monthly plans;"
          }
        ],
        [
          {
            "text": "annual plans;"
          }
        ],
        [
          {
            "text": "promotional packages."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Subscription details will be shown at purchase."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. AUTO-RENEWAL",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Unless cancelled:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "subscriptions may renew automatically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are responsible for managing renewal settings."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. CANCELLATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may cancel future renewals at any time."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Cancellation stops future billing but does not automatically trigger refunds."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. REFUND ELIGIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Generally:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "fees are non-refundable."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Refunds may be considered where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "duplicate payment occurred;"
          }
        ],
        [
          {
            "text": "technical billing error exists;"
          }
        ],
        [
          {
            "text": "platform access was not delivered."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Refund decisions remain discretionary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. FEATURED LISTINGS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Paid listing boosts or featured placements:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "do not guarantee:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "leads"
          }
        ],
        [
          {
            "text": "commissions"
          }
        ],
        [
          {
            "text": "visibility outcomes"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Results vary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. FAILED PAYMENTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "suspend premium access;"
          }
        ],
        [
          {
            "text": "downgrade memberships;"
          }
        ],
        [
          {
            "text": "restrict premium visibility"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "until payment is resolved."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. FUTURE PRICING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "modify pricing;"
          }
        ],
        [
          {
            "text": "introduce new plans;"
          }
        ],
        [
          {
            "text": "discontinue subscriptions."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Reasonable notice may be provided."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": "  support@dxbdealflow.com"
        }
      ]
    }
  ]
} satisfies LegalPageContent;

export const verificationPolicyContent = {
  "route": "/verification-policy",
  "label": "Verification Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – VERIFICATION & MEMBERSHIP POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a "
        },
        {
          "text": "private, professionally moderated property deal platform",
          "bold": true
        },
        {
          "text": " designed for approved members of the real estate ecosystem."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To maintain trust, deal quality, and broker confidence, all users are subject to an approval and verification process."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Verification & Membership Policy explains:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "who may join;"
          }
        ],
        [
          {
            "text": "how approval works;"
          }
        ],
        [
          {
            "text": "access levels;"
          }
        ],
        [
          {
            "text": "membership categories;"
          }
        ],
        [
          {
            "text": "verification requirements."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Registration alone does not guarantee access."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. WHO MAY APPLY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow accepts applications from approved professional categories only."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Membership may be granted to:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "A. Licensed Real Estate Brokers",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "B. Verified Investors",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "C. Strategic Partners",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Access permissions vary by account type."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. LICENSED REAL ESTATE BROKERS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Broker membership is intended for licensed professionals involved in real estate transactions."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Applicants may be required to provide:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "full legal name;"
          }
        ],
        [
          {
            "text": "BRN / RERA number;"
          }
        ],
        [
          {
            "text": "agency information;"
          }
        ],
        [
          {
            "text": "registered business email;"
          }
        ],
        [
          {
            "text": "WhatsApp number;"
          }
        ],
        [
          {
            "text": "broker profile image;"
          }
        ],
        [
          {
            "text": "LinkedIn profile (optional);"
          }
        ],
        [
          {
            "text": "Instagram handle (optional)."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Broker Verification",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Broker accounts may be verified through:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Automatic Verification",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where available, DXB Deal Flow may validate:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker name;"
          }
        ],
        [
          {
            "text": "BRN number;"
          }
        ],
        [
          {
            "text": "email;"
          }
        ],
        [
          {
            "text": "agency affiliation."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Automatic approval may be granted where information successfully matches available records."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Manual Review",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Some broker accounts may require additional checks."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Reasons may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "incomplete information;"
          }
        ],
        [
          {
            "text": "mismatched details;"
          }
        ],
        [
          {
            "text": "unavailable records;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "expired credentials;"
          }
        ],
        [
          {
            "text": "suspicious activity."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves full discretion regarding approval decisions."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Broker Access Rights",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approved broker users may receive access to:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "Listing uploads"
          }
        ],
        [
          {
            "text": "Buyer requirement submissions"
          }
        ],
        [
          {
            "text": "Broker messaging"
          }
        ],
        [
          {
            "text": "Listing sharing tools"
          }
        ],
        [
          {
            "text": "Deal alerts"
          }
        ],
        [
          {
            "text": "Priority inventory"
          }
        ],
        [
          {
            "text": "Off-market opportunities"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Permissions may vary depending on account standing."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. VERIFIED INVESTORS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor access is available to selected individuals and organisations."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "private investors;"
          }
        ],
        [
          {
            "text": "family offices;"
          }
        ],
        [
          {
            "text": "high-net-worth individuals;"
          }
        ],
        [
          {
            "text": "investment representatives;"
          }
        ],
        [
          {
            "text": "institutional buyers."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor verification may require:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "identity confirmation;"
          }
        ],
        [
          {
            "text": "investment background;"
          }
        ],
        [
          {
            "text": "business information;"
          }
        ],
        [
          {
            "text": "professional references;"
          }
        ],
        [
          {
            "text": "additional due diligence."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Restricted Investor Access",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To protect brokers and platform integrity, investor access may be limited."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investors may:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "View approved listings"
          }
        ],
        [
          {
            "text": "Submit enquiries"
          }
        ],
        [
          {
            "text": "Save opportunities"
          }
        ],
        [
          {
            "text": "Receive curated deal alerts"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investors may not:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "access broker-only areas"
          }
        ],
        [
          {
            "text": "post broker inventory"
          }
        ],
        [
          {
            "text": "access private broker discussions"
          }
        ],
        [
          {
            "text": "scrape broker information"
          }
        ],
        [
          {
            "text": "bypass broker relationships"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Certain contact details may remain hidden."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. STRATEGIC PARTNERS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Strategic partner membership is intended for professionals supporting the real estate ecosystem."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "mortgage brokers;"
          }
        ],
        [
          {
            "text": "lawyers;"
          }
        ],
        [
          {
            "text": "conveyancers;"
          }
        ],
        [
          {
            "text": "Golden Visa specialists;"
          }
        ],
        [
          {
            "text": "developers;"
          }
        ],
        [
          {
            "text": "wealth advisers;"
          }
        ],
        [
          {
            "text": "tax specialists;"
          }
        ],
        [
          {
            "text": "finance professionals."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Strategic partner applications are reviewed individually."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Strategic Partner Permissions",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Permissions may include:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "limited platform visibility"
          }
        ],
        [
          {
            "text": "referral collaboration"
          }
        ]
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "selected messaging access"
          }
        ],
        [
          {
            "text": "approved partnership opportunities"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Strategic partners may not aggressively market services or misuse access privileges."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. MEMBERSHIP APPROVAL PROCESS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Applications generally follow one of the following routes:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 1 – Registration",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "User submits:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "profile details;"
          }
        ],
        [
          {
            "text": "professional information;"
          }
        ],
        [
          {
            "text": "supporting data."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 2 – Verification",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reviews:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "identity;"
          }
        ],
        [
          {
            "text": "professional standing;"
          }
        ],
        [
          {
            "text": "licensing;"
          }
        ],
        [
          {
            "text": "credibility."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 3 – Approval Decision",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Applications may be:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Approved",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Access granted."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Pending Review",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Additional checks required."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Rejected",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Access denied."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Review Timeframes",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approval times may vary."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "While many applications are reviewed quickly, DXB Deal Flow does not guarantee approval timelines."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. MEMBERSHIP LEVELS & ACCESS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may introduce:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "free membership;"
          }
        ],
        [
          {
            "text": "premium plans;"
          }
        ],
        [
          {
            "text": "subscription access;"
          }
        ],
        [
          {
            "text": "priority broker tiers;"
          }
        ],
        [
          {
            "text": "founding member privileges."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Access rights may evolve over time."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to modify features, permissions, and access models."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. FOUNDING MEMBERS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Early platform members may receive:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "priority onboarding;"
          }
        ],
        [
          {
            "text": "social media recognition;"
          }
        ],
        [
          {
            "text": "preferred visibility;"
          }
        ],
        [
          {
            "text": "early platform incentives;"
          }
        ],
        [
          {
            "text": "access to exclusive updates."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status does not create guaranteed commercial entitlement."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Benefits may change over time."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. PROFILE EXPECTATIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Members are encouraged to maintain professional profiles."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "High-quality profiles generally receive greater engagement."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Recommended profile elements include:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "profile image"
          }
        ],
        [
          {
            "text": "professional biography"
          }
        ],
        [
          {
            "text": "agency details"
          }
        ],
        [
          {
            "text": "LinkedIn profile"
          }
        ],
        [
          {
            "text": "Instagram profile"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Incomplete profiles may receive reduced visibility."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. FALSE INFORMATION & MISREPRESENTATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Applicants may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "falsify credentials;"
          }
        ],
        [
          {
            "text": "impersonate brokers;"
          }
        ],
        [
          {
            "text": "misrepresent licensing;"
          }
        ],
        [
          {
            "text": "create duplicate accounts;"
          }
        ],
        [
          {
            "text": "provide misleading information."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "False information may result in:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Immediate rejection or permanent removal."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. ACCOUNT SUSPENSION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Membership may be suspended where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "verification expires;"
          }
        ],
        [
          {
            "text": "platform misuse occurs;"
          }
        ],
        [
          {
            "text": "complaints arise;"
          }
        ],
        [
          {
            "text": "ethical concerns emerge;"
          }
        ],
        [
          {
            "text": "conduct breaches policies."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Access may be restricted while investigations occur."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. NO GUARANTEE OF APPROVAL",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves sole discretion regarding:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "membership approval;"
          }
        ],
        [
          {
            "text": "suspension;"
          }
        ],
        [
          {
            "text": "reinstatement;"
          }
        ],
        [
          {
            "text": "restrictions."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approval is a privilege and not a right."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may change periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Updates may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "platform growth;"
          }
        ],
        [
          {
            "text": "regulatory changes;"
          }
        ],
        [
          {
            "text": "abuse prevention;"
          }
        ],
        [
          {
            "text": "evolving membership models."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": "  support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By registering for DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "verification may be required;"
          }
        ],
        [
          {
            "text": "approval is discretionary;"
          }
        ],
        [
          {
            "text": "access levels vary;"
          }
        ],
        [
          {
            "text": "platform protections exist to preserve trust and deal quality."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const listingStandardsContent = {
  "route": "/listing-standards",
  "label": "Listing Standards & Moderation Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – LISTING STANDARDS & MODERATION POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a curated professional marketplace for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "off-market opportunities;"
          }
        ],
        [
          {
            "text": "distressed inventory;"
          }
        ],
        [
          {
            "text": "broker-to-broker opportunities;"
          }
        ],
        [
          {
            "text": "developer stock;"
          }
        ],
        [
          {
            "text": "buyer requirements;"
          }
        ],
        [
          {
            "text": "strategic investment opportunities."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To maintain trust, listing quality, and deal integrity, all listings are subject to moderation and quality standards."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy explains:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "listing expectations;"
          }
        ],
        [
          {
            "text": "approval criteria;"
          }
        ],
        [
          {
            "text": "moderation standards;"
          }
        ],
        [
          {
            "text": "rejection reasons;"
          }
        ],
        [
          {
            "text": "broker responsibilities."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Submission of a listing does not guarantee publication."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. PURPOSE OF MODERATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Moderation exists to:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "maintain trust"
          }
        ],
        [
          {
            "text": "improve deal quality"
          }
        ]
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "reduce fake listings"
          }
        ],
        [
          {
            "text": "remove spam inventory"
          }
        ],
        [
          {
            "text": "protect brokers"
          }
        ],
        [
          {
            "text": "improve platform experience"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is designed to prioritise:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "quality over quantity",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. TYPES OF LISTINGS ALLOWED",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approved listings may include:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Off-Market Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Inventory not publicly marketed."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Distressed Opportunities",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where genuine urgency exists."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "motivated seller;"
          }
        ],
        [
          {
            "text": "urgent liquidity;"
          }
        ],
        [
          {
            "text": "time-sensitive exit;"
          }
        ],
        [
          {
            "text": "below-market sale."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "False distressed claims are prohibited."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Developer Stock",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "exclusive inventory;"
          }
        ],
        [
          {
            "text": "launch opportunities;"
          }
        ],
        [
          {
            "text": "allocations;"
          }
        ],
        [
          {
            "text": "special payment plans."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Investment Opportunities",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where professionally represented."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Buyer Requirements",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Genuine client mandates."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. LISTING REQUIREMENTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All listings should contain reasonable and accurate information."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Minimum recommended standards include:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Property Information",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "property type;"
          }
        ],
        [
          {
            "text": "location;"
          }
        ],
        [
          {
            "text": "community;"
          }
        ],
        [
          {
            "text": "size;"
          }
        ],
        [
          {
            "text": "bedroom count;"
          }
        ],
        [
          {
            "text": "price;"
          }
        ],
        [
          {
            "text": "payment structure (if relevant)."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Supporting Media",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where possible:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "professional images;"
          }
        ],
        [
          {
            "text": "floorplans;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "renders;"
          }
        ],
        [
          {
            "text": "YouTube video walkthroughs."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Poor-quality uploads may reduce visibility."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Description Standards",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Descriptions should be:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "factual;"
          }
        ],
        [
          {
            "text": "accurate;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "commercially reasonable;"
          }
        ],
        [
          {
            "text": "professionally written."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should avoid:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "misleading hype"
          }
        ],
        [
          {
            "text": "fake urgency"
          }
        ],
        [
          {
            "text": "exaggerated claims"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. BELOW MARKET CLAIMS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Claims such as:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "“10% below market”  “Distressed pricing”  “Best deal in the market”"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "must be supportable."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may request supporting evidence including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "comparable transactions;"
          }
        ],
        [
          {
            "text": "market pricing;"
          }
        ],
        [
          {
            "text": "valuation support;"
          }
        ],
        [
          {
            "text": "developer pricing references."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Unsubstantiated claims may result in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "rejection;"
          }
        ],
        [
          {
            "text": "visibility reduction;"
          }
        ],
        [
          {
            "text": "removal."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. ROI & INVESTMENT CLAIMS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may reference:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "rental yield;"
          }
        ],
        [
          {
            "text": "ROI potential;"
          }
        ],
        [
          {
            "text": "appreciation expectations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All investment claims must remain commercially reasonable."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "guarantee returns"
          }
        ],
        [
          {
            "text": "promise appreciation"
          }
        ],
        [
          {
            "text": "fabricate rental performance"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Recommended wording:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "“Estimated”"
          }
        ],
        [
          {
            "text": "“Projected”"
          }
        ],
        [
          {
            "text": "“Potential”"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Not:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "“Guaranteed return”"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to edit or remove misleading investment claims."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. PROHIBITED LISTINGS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The following are prohibited:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "False Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Non-existent inventory."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Sold / Unavailable Stock",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Outdated opportunities uploaded as active."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Duplicate Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated inventory uploads intended to manipulate visibility."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Misleading Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "inaccurate pricing;"
          }
        ],
        [
          {
            "text": "false location;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "manipulated information."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Fake Distressed Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Claiming urgency without basis."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Confidential Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Listings may not include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "passport copies;"
          }
        ],
        [
          {
            "text": "title deeds without consent;"
          }
        ],
        [
          {
            "text": "confidential owner information;"
          }
        ],
        [
          {
            "text": "personal data."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Illegal or Restricted Content",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including unlawful activity or prohibited promotions."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. LISTING REVIEW PROCESS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Listings may pass through the following stages:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Draft",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Saved privately."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Pending Review",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Submitted for moderation."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Approved",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Published and live."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Rejected",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Returned for revision."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Expired",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Automatically removed from active visibility."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Removed",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Taken down by moderation."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. MODERATION RIGHTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "approve listings;"
          }
        ],
        [
          {
            "text": "reject listings;"
          }
        ],
        [
          {
            "text": "request revisions;"
          }
        ],
        [
          {
            "text": "modify visibility;"
          }
        ],
        [
          {
            "text": "remove misleading content;"
          }
        ],
        [
          {
            "text": "hide listings;"
          }
        ],
        [
          {
            "text": "request supporting information."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Moderation decisions remain discretionary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. REJECTION REASONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Listings may be rejected due to:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Missing Information",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Incomplete details."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Poor Media Quality",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Low-resolution or insufficient imagery."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Pricing Concerns",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Unverifiable claims."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Duplicate Inventory",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated uploads."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Misleading Descriptions",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Overstated or inaccurate content."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Verification Concerns",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Questions around ownership or authority."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Suspicious Activity",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Potential fraud or abuse."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. DISTRESSED & URGENT SALE CLAIMS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users must exercise caution when using terms such as:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "distressed;"
          }
        ],
        [
          {
            "text": "urgent;"
          }
        ],
        [
          {
            "text": "below market;"
          }
        ],
        [
          {
            "text": "liquidation;"
          }
        ],
        [
          {
            "text": "motivated seller."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to request justification."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Misuse may result in:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "suspension of listing privileges."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. BROKER RESPONSIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The listing owner remains solely responsible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "accuracy;"
          }
        ],
        [
          {
            "text": "permissions;"
          }
        ],
        [
          {
            "text": "mandates;"
          }
        ],
        [
          {
            "text": "pricing;"
          }
        ],
        [
          {
            "text": "supporting claims."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not independently verify every listing."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Approval does not constitute endorsement."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. LISTING PERFORMANCE & VISIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may rank listings using factors such as:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "profile quality;"
          }
        ],
        [
          {
            "text": "listing completeness;"
          }
        ],
        [
          {
            "text": "image quality;"
          }
        ],
        [
          {
            "text": "engagement;"
          }
        ],
        [
          {
            "text": "responsiveness;"
          }
        ],
        [
          {
            "text": "account standing."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Higher-quality listings may receive:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "greater visibility"
          }
        ],
        [
          {
            "text": "higher placement"
          }
        ],
        [
          {
            "text": "priority exposure"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Quality Scores",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may display:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "completeness percentages;"
          }
        ],
        [
          {
            "text": "listing badges;"
          }
        ],
        [
          {
            "text": "profile quality indicators."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Example:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "“100% Complete Listing”"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This is intended to improve transparency and engagement."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. REPORTING CONCERNS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may report:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fake inventory;"
          }
        ],
        [
          {
            "text": "suspicious listings;"
          }
        ],
        [
          {
            "text": "misleading pricing;"
          }
        ],
        [
          {
            "text": "unethical conduct."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Reports should be sent to:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may investigate where appropriate."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "15. REPEAT VIOLATIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated breaches may result in:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Warning",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Reduced Visibility",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Restrictions",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Temporary Suspension",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Permanent Removal",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform trust remains the priority."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "16. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may change periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Updates may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "market conditions;"
          }
        ],
        [
          {
            "text": "platform improvements;"
          }
        ],
        [
          {
            "text": "abuse prevention;"
          }
        ],
        [
          {
            "text": "moderation standards."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "17. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": "  support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By uploading listings to DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "listings may be reviewed;"
          }
        ],
        [
          {
            "text": "approval is discretionary;"
          }
        ],
        [
          {
            "text": "moderation standards apply;"
          }
        ],
        [
          {
            "text": "misleading inventory may be removed."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const coBrokePolicyContent = {
  "route": "/co-broke-policy",
  "label": "Co-Broke & Commission Disclaimer",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – CO-BROKE & COMMISSION DISCLAIMER",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a private professional marketplace designed to facilitate:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker-to-broker collaboration;"
          }
        ],
        [
          {
            "text": "introductions;"
          }
        ],
        [
          {
            "text": "off-market opportunities;"
          }
        ],
        [
          {
            "text": "buyer requirement matching;"
          }
        ],
        [
          {
            "text": "professional communication."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is "
        },
        {
          "text": "not a party to any property transaction",
          "bold": true
        },
        {
          "text": " and does not participate in commission negotiations or brokerage agreements between users."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy explains the limits of DXB Deal Flow’s involvement regarding:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "commissions;"
          }
        ],
        [
          {
            "text": "co-broke arrangements;"
          }
        ],
        [
          {
            "text": "introductions;"
          }
        ],
        [
          {
            "text": "referral fees;"
          }
        ],
        [
          {
            "text": "disputes."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. PLATFORM ROLE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow acts solely as:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "a technology and communication platform",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "for approved members of the real estate ecosystem."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "facilitates visibility of opportunities"
          }
        ],
        [
          {
            "text": "allows broker introductions"
          }
        ],
        [
          {
            "text": "enables communication"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does "
        },
        {
          "text": "not",
          "bold": true
        },
        {
          "text": ":"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "negotiate commission splits"
          }
        ],
        [
          {
            "text": "enforce fee arrangements"
          }
        ],
        [
          {
            "text": "guarantee payment"
          }
        ],
        [
          {
            "text": "act as intermediary in disputes"
          }
        ],
        [
          {
            "text": "guarantee introductions result in deals"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. INDEPENDENT BROKER RELATIONSHIPS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All users acknowledge that:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Any:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "co-broke arrangement;"
          }
        ],
        [
          {
            "text": "referral fee;"
          }
        ],
        [
          {
            "text": "commission agreement;"
          }
        ],
        [
          {
            "text": "transaction structure;"
          }
        ],
        [
          {
            "text": "payment obligation"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "exists solely between participating parties."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is not a contractual party."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Broker Responsibility",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are solely responsible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "agreeing fees;"
          }
        ],
        [
          {
            "text": "documenting arrangements;"
          }
        ],
        [
          {
            "text": "protecting introductions;"
          }
        ],
        [
          {
            "text": "confirming payment structures;"
          }
        ],
        [
          {
            "text": "complying with RERA regulations;"
          }
        ],
        [
          {
            "text": "obtaining written confirmations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow strongly recommends:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "all commission arrangements are agreed in writing before proceeding.",
          "bold": true
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. CO-BROKE ARRANGEMENTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where brokers collaborate through DXB Deal Flow:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain responsible for agreeing:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "commission percentages;"
          }
        ],
        [
          {
            "text": "fee splits;"
          }
        ],
        [
          {
            "text": "exclusivity;"
          }
        ],
        [
          {
            "text": "deal structure;"
          }
        ],
        [
          {
            "text": "lead ownership;"
          }
        ],
        [
          {
            "text": "responsibilities."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow has no control over private commercial arrangements."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Implied Commission Rights",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform usage does not automatically create entitlement to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "commission;"
          }
        ],
        [
          {
            "text": "co-broke rights;"
          }
        ],
        [
          {
            "text": "referral fees;"
          }
        ],
        [
          {
            "text": "ownership of leads."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Introductions alone do not constitute legally enforceable entitlement."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are encouraged to formalise arrangements independently."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. INTRODUCTIONS & LEAD OWNERSHIP",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may facilitate introductions between:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "brokers;"
          }
        ],
        [
          {
            "text": "investors;"
          }
        ],
        [
          {
            "text": "strategic partners;"
          }
        ],
        [
          {
            "text": "buyers;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "sellers."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not determine:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "who introduced whom;"
          }
        ],
        [
          {
            "text": "lead ownership;"
          }
        ],
        [
          {
            "text": "buyer ownership;"
          }
        ],
        [
          {
            "text": "transaction rights."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "These remain matters between users."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Communication Records",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where disputes arise:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may, at its sole discretion:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "review platform communications;"
          }
        ],
        [
          {
            "text": "investigate complaints;"
          }
        ],
        [
          {
            "text": "restrict accounts."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is under "
        },
        {
          "text": "no obligation",
          "bold": true
        },
        {
          "text": " to act as evidence provider, mediator, or arbitrator."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. INVESTOR INTRODUCTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where investors are introduced through the Platform:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investors agree to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "act ethically;"
          }
        ],
        [
          {
            "text": "respect introducing brokers;"
          }
        ],
        [
          {
            "text": "avoid bad-faith circumvention."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "investor behaviour;"
          }
        ],
        [
          {
            "text": "deal completion;"
          }
        ],
        [
          {
            "text": "exclusivity."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain responsible for protecting their own relationships."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. NON-CIRCUMVENTION EXPECTATIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow encourages ethical collaboration."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should not intentionally:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "bypass introducing brokers;"
          }
        ],
        [
          {
            "text": "avoid agreed commissions;"
          }
        ],
        [
          {
            "text": "misuse platform information;"
          }
        ],
        [
          {
            "text": "exploit introductions unfairly."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Credible evidence of intentional bad-faith circumvention may result in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "warnings;"
          }
        ],
        [
          {
            "text": "restrictions;"
          }
        ],
        [
          {
            "text": "suspension;"
          }
        ],
        [
          {
            "text": "permanent removal."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee enforcement of private agreements."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. NO LIABILITY FOR COMMISSION DISPUTES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "unpaid commissions;"
          }
        ],
        [
          {
            "text": "referral disagreements;"
          }
        ],
        [
          {
            "text": "lead ownership disputes;"
          }
        ],
        [
          {
            "text": "co-broke disagreements;"
          }
        ],
        [
          {
            "text": "failed introductions;"
          }
        ],
        [
          {
            "text": "lost fees;"
          }
        ],
        [
          {
            "text": "broken agreements;"
          }
        ],
        [
          {
            "text": "transaction disputes."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users participate at their own commercial risk."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. NO PAYMENT GUARANTEE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "hold commission funds;"
          }
        ],
        [
          {
            "text": "process payments;"
          }
        ],
        [
          {
            "text": "act as escrow;"
          }
        ],
        [
          {
            "text": "guarantee fee collection."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain solely responsible for collecting any agreed compensation."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. NO TRANSACTION INVOLVEMENT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is not involved in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "SPAs;"
          }
        ],
        [
          {
            "text": "reservation agreements;"
          }
        ],
        [
          {
            "text": "transfer documentation;"
          }
        ],
        [
          {
            "text": "negotiations;"
          }
        ],
        [
          {
            "text": "conveyancing;"
          }
        ],
        [
          {
            "text": "mortgage arrangements."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Transactions remain independent of the Platform."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. DISPUTE POSITION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where disputes arise:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are encouraged to resolve matters:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "privately and professionally."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may choose to review serious complaints affecting platform integrity."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is not obligated to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "investigate;"
          }
        ]
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "arbitrate;"
          }
        ],
        [
          {
            "text": "mediate;"
          }
        ],
        [
          {
            "text": "determine fault."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. RERA & LEGAL COMPLIANCE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain responsible for complying with:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "RERA regulations;"
          }
        ],
        [
          {
            "text": "Dubai brokerage laws;"
          }
        ],
        [
          {
            "text": "agency obligations;"
          }
        ],
        [
          {
            "text": "legal disclosure requirements."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow assumes no responsibility for regulatory breaches by users."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may be updated periodically to reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "platform changes;"
          }
        ],
        [
          {
            "text": "legal considerations;"
          }
        ],
        [
          {
            "text": "dispute trends;"
          }
        ],
        [
          {
            "text": "operational requirements."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": "  support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "DXB Deal Flow is not party to brokerage agreements;"
          }
        ],
        [
          {
            "text": "commissions remain private arrangements;"
          }
        ],
        [
          {
            "text": "the Platform is not liable for disputes;"
          }
        ],
        [
          {
            "text": "all commercial relationships are entered into independently."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const maintenancePolicyContent = {
  "route": "/maintenance-policy",
  "label": "Maintenance & Platform Availability Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – MAINTENANCE & PLATFORM AVAILABILITY POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a technology platform designed to facilitate:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker collaboration;"
          }
        ],
        [
          {
            "text": "property opportunity visibility;"
          }
        ],
        [
          {
            "text": "buyer requirement matching;"
          }
        ],
        [
          {
            "text": "communication between approved users."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "To maintain performance, security, and user experience, DXB Deal Flow may periodically undergo:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "maintenance;"
          }
        ],
        [
          {
            "text": "updates;"
          }
        ],
        [
          {
            "text": "upgrades;"
          }
        ],
        [
          {
            "text": "redesigns;"
          }
        ],
        [
          {
            "text": "feature improvements."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy explains platform availability expectations and limitations."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. PLATFORM AVAILABILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow aims to provide a reliable and professional platform experience."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "continuous, uninterrupted availability cannot be guaranteed.",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users acknowledge that occasional disruptions may occur."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "temporary outages;"
          }
        ],
        [
          {
            "text": "feature interruptions;"
          }
        ],
        [
          {
            "text": "maintenance windows;"
          }
        ],
        [
          {
            "text": "technical issues;"
          }
        ],
        [
          {
            "text": "performance slowdowns."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. SCHEDULED MAINTENANCE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may occasionally schedule maintenance to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "improve platform performance;"
          }
        ],
        [
          {
            "text": "add new features;"
          }
        ],
        [
          {
            "text": "optimise systems;"
          }
        ],
        [
          {
            "text": "improve security;"
          }
        ],
        [
          {
            "text": "fix technical issues."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where practical, users may receive notice via:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "email;"
          }
        ],
        [
          {
            "text": "platform alerts;"
          }
        ],
        [
          {
            "text": "maintenance pages;"
          }
        ],
        [
          {
            "text": "system notifications."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is not obligated to provide advance notice."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. UNSCHEDULED INTERRUPTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Unexpected issues may occasionally occur."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "server failures;"
          }
        ],
        [
          {
            "text": "hosting interruptions;"
          }
        ],
        [
          {
            "text": "third-party outages;"
          }
        ],
        [
          {
            "text": "cyber threats;"
          }
        ],
        [
          {
            "text": "software bugs;"
          }
        ],
        [
          {
            "text": "emergency fixes."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users acknowledge that certain interruptions may occur without warning."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. PLATFORM CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the unrestricted right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "redesign pages;"
          }
        ],
        [
          {
            "text": "modify workflows;"
          }
        ],
        [
          {
            "text": "add or remove features;"
          }
        ],
        [
          {
            "text": "alter permissions;"
          }
        ],
        [
          {
            "text": "change visibility systems;"
          }
        ],
        [
          {
            "text": "introduce subscription tiers;"
          }
        ],
        [
          {
            "text": "change notification systems;"
          }
        ],
        [
          {
            "text": "retire features."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance of such changes."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. LISTING & MESSAGE INTERRUPTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "During updates or maintenance:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may temporarily experience:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "delayed listing approvals;"
          }
        ],
        [
          {
            "text": "temporary listing visibility issues;"
          }
        ],
        [
          {
            "text": "message delays;"
          }
        ],
        [
          {
            "text": "notification interruptions;"
          }
        ],
        [
          {
            "text": "dashboard issues;"
          }
        ],
        [
          {
            "text": "search limitations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow will make commercially reasonable efforts to restore functionality."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No restoration timeframe is guaranteed."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. NO LIABILITY FOR MISSED OPPORTUNITIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "missed property opportunities;"
          }
        ],
        [
          {
            "text": "delayed responses;"
          }
        ],
        [
          {
            "text": "lost enquiries;"
          }
        ],
        [
          {
            "text": "interrupted communication;"
          }
        ],
        [
          {
            "text": "expired opportunities;"
          }
        ],
        [
          {
            "text": "delayed notifications;"
          }
        ],
        [
          {
            "text": "missed broker messages;"
          }
        ],
        [
          {
            "text": "reduced visibility."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users participate at their own commercial risk."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. THIRD-PARTY SYSTEM DEPENDENCIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may rely on third-party systems including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "hosting providers;"
          }
        ],
        [
          {
            "text": "email systems;"
          }
        ],
        [
          {
            "text": "analytics providers;"
          }
        ],
        [
          {
            "text": "authentication services;"
          }
        ],
        [
          {
            "text": "messaging infrastructure;"
          }
        ],
        [
          {
            "text": "integrations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow accepts no responsibility for failures caused by third-party providers."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. MAINTENANCE MODE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "From time to time, DXB Deal Flow may place the Platform into:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Maintenance Mode",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may temporarily restrict:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "logins;"
          }
        ],
        [
          {
            "text": "listings;"
          }
        ],
        [
          {
            "text": "messaging;"
          }
        ],
        [
          {
            "text": "dashboards;"
          }
        ],
        [
          {
            "text": "searches."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "During Maintenance Mode:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Certain features may be unavailable until updates are complete."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. BETA FEATURES & TESTING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Some features may be introduced as:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Beta Features",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Beta features may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "contain bugs;"
          }
        ],
        [
          {
            "text": "change rapidly;"
          }
        ],
        [
          {
            "text": "be discontinued;"
          }
        ],
        [
          {
            "text": "operate differently than expected."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users acknowledge that participation in beta functionality is voluntary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. USER RESPONSIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are encouraged to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "maintain independent records;"
          }
        ],
        [
          {
            "text": "retain important communications;"
          }
        ],
        [
          {
            "text": "document co-broke agreements;"
          }
        ],
        [
          {
            "text": "save critical deal information."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow should not be relied upon as the sole repository for important business information."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. SECURITY & EMERGENCY ACTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where necessary to protect platform integrity, DXB Deal Flow may immediately:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "restrict access;"
          }
        ],
        [
          {
            "text": "suspend functionality;"
          }
        ],
        [
          {
            "text": "disable messaging;"
          }
        ],
        [
          {
            "text": "remove content;"
          }
        ],
        [
          {
            "text": "temporarily shut down systems."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may occur without notice where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fraud is suspected;"
          }
        ],
        [
          {
            "text": "cyber risk exists;"
          }
        ],
        [
          {
            "text": "security concerns arise."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. FORCE MAJEURE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for interruptions caused by events outside reasonable control."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "internet outages;"
          }
        ],
        [
          {
            "text": "cyberattacks;"
          }
        ],
        [
          {
            "text": "natural disasters;"
          }
        ],
        [
          {
            "text": "regulatory action;"
          }
        ],
        [
          {
            "text": "governmental restrictions;"
          }
        ],
        [
          {
            "text": "hosting failures;"
          }
        ],
        [
          {
            "text": "telecommunications disruptions."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may be updated periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Changes may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "technology changes;"
          }
        ],
        [
          {
            "text": "operational improvements;"
          }
        ],
        [
          {
            "text": "legal requirements;"
          }
        ],
        [
          {
            "text": "platform growth."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "15. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": " support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "downtime may occasionally occur;"
          }
        ],
        [
          {
            "text": "uninterrupted access is not guaranteed;"
          }
        ],
        [
          {
            "text": "features may change over time;"
          }
        ],
        [
          {
            "text": "DXB Deal Flow is not liable for missed opportunities or interruptions."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const complaintsComplianceContent = {
  "route": "/complaints-compliance",
  "label": "Complaints & Compliance Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – COMPLAINTS & COMPLIANCE POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is committed to maintaining a professional, trusted, and compliant platform for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "licensed real estate brokers;"
          }
        ],
        [
          {
            "text": "verified investors;"
          }
        ],
        [
          {
            "text": "strategic partners."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy explains how users may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "raise concerns;"
          }
        ],
        [
          {
            "text": "submit complaints;"
          }
        ],
        [
          {
            "text": "report misconduct;"
          }
        ],
        [
          {
            "text": "escalate issues."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The goal of this process is to maintain:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "trust"
          }
        ],
        [
          {
            "text": "professionalism"
          }
        ],
        [
          {
            "text": "broker protection"
          }
        ],
        [
          {
            "text": "platform integrity"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. WHAT CAN BE REPORTED",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may submit complaints or concerns relating to:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listings",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fake inventory;"
          }
        ],
        [
          {
            "text": "duplicate listings;"
          }
        ],
        [
          {
            "text": "misleading pricing;"
          }
        ],
        [
          {
            "text": "false distressed claims;"
          }
        ],
        [
          {
            "text": "inaccurate information."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Broker Conduct",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "harassment;"
          }
        ],
        [
          {
            "text": "abusive behaviour;"
          }
        ],
        [
          {
            "text": "unethical activity;"
          }
        ],
        [
          {
            "text": "spam;"
          }
        ],
        [
          {
            "text": "misleading claims;"
          }
        ],
        [
          {
            "text": "impersonation."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Co-Broke Concerns",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "suspected circumvention;"
          }
        ],
        [
          {
            "text": "unethical behaviour;"
          }
        ],
        [
          {
            "text": "bad-faith conduct."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Important:",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not arbitrate commission disputes."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However, serious platform misuse may be reviewed."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Messaging Misuse",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "spam messaging;"
          }
        ],
        [
          {
            "text": "aggressive solicitation;"
          }
        ],
        [
          {
            "text": "harassment;"
          }
        ],
        [
          {
            "text": "scams;"
          }
        ],
        [
          {
            "text": "inappropriate behaviour."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Copyright & Content",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "stolen images;"
          }
        ],
        [
          {
            "text": "copied listings;"
          }
        ],
        [
          {
            "text": "unauthorised brochures;"
          }
        ],
        [
          {
            "text": "content infringement."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Verification Concerns",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fake broker accounts;"
          }
        ],
        [
          {
            "text": "suspicious users;"
          }
        ],
        [
          {
            "text": "inaccurate credentials."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Platform Security",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "suspicious activity;"
          }
        ],
        [
          {
            "text": "fake accounts;"
          }
        ],
        [
          {
            "text": "attempted scraping;"
          }
        ],
        [
          {
            "text": "fraud concerns."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. HOW TO SUBMIT A COMPLAINT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Complaints should be submitted via:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should include:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Required Information",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "full name;"
          }
        ],
        [
          {
            "text": "registered email;"
          }
        ],
        [
          {
            "text": "issue summary;"
          }
        ],
        [
          {
            "text": "relevant listing or account details."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Supporting Evidence (Where Available)",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "screenshots;"
          }
        ],
        [
          {
            "text": "messages;"
          }
        ],
        [
          {
            "text": "listing links;"
          }
        ],
        [
          {
            "text": "dates;"
          }
        ],
        [
          {
            "text": "supporting documentation."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Providing evidence helps improve review accuracy."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. COMPLAINT REVIEW PROCESS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Complaints may follow the below process:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 1 — Receipt",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Issue received and logged."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 2 — Initial Review",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may assess:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "severity;"
          }
        ],
        [
          {
            "text": "evidence;"
          }
        ],
        [
          {
            "text": "platform relevance."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 3 — Investigation (Where Appropriate)",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This may include reviewing:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "account activity;"
          }
        ],
        [
          {
            "text": "listings;"
          }
        ],
        [
          {
            "text": "messaging history;"
          }
        ],
        [
          {
            "text": "verification information."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Step 4 — Outcome",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Possible actions may include:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "No Action",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Insufficient evidence."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Warning",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Minor breach."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Removal",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Content moderation."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Access Restrictions",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Temporary limitation."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Suspension",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Temporary removal."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Permanent Removal",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Serious breach."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. COMPLIANCE REVIEWS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to investigate concerns relating to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fake inventory;"
          }
        ],
        [
          {
            "text": "fraud;"
          }
        ],
        [
          {
            "text": "suspicious conduct;"
          }
        ],
        [
          {
            "text": "platform misuse;"
          }
        ],
        [
          {
            "text": "repeated complaints;"
          }
        ],
        [
          {
            "text": "abuse of messaging."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform integrity remains the priority."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. NON-RETALIATION EXPECTATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users should not retaliate against individuals who raise legitimate concerns."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Retaliation may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "harassment;"
          }
        ],
        [
          {
            "text": "threats;"
          }
        ],
        [
          {
            "text": "intimidation;"
          }
        ],
        [
          {
            "text": "abusive communication."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Such conduct may result in suspension."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. COMMISSION DISPUTES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does "
        },
        {
          "text": "not",
          "bold": true
        },
        {
          "text": ":"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "mediate commission disputes"
          }
        ],
        [
          {
            "text": "determine entitlement"
          }
        ],
        [
          {
            "text": "enforce co-broke agreements"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain responsible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "written agreements;"
          }
        ],
        [
          {
            "text": "legal protections;"
          }
        ],
        [
          {
            "text": "fee structures."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where disputes suggest unethical platform misuse, DXB Deal Flow may review conduct for policy breaches."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. FALSE OR MALICIOUS REPORTING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not knowingly submit:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "false complaints;"
          }
        ],
        [
          {
            "text": "fabricated evidence;"
          }
        ],
        [
          {
            "text": "malicious allegations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Abuse of the complaints process may result in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "warnings;"
          }
        ],
        [
          {
            "text": "restrictions;"
          }
        ],
        [
          {
            "text": "suspension."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. CONFIDENTIALITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow will make reasonable efforts to treat complaints professionally."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not guarantee complete confidentiality where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "legal obligations exist;"
          }
        ],
        [
          {
            "text": "investigations require disclosure;"
          }
        ],
        [
          {
            "text": "platform protection is necessary."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. PLATFORM DISCRETION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All compliance and moderation decisions remain at the sole discretion of DXB Deal Flow."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is under no obligation to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "explain internal decisions;"
          }
        ],
        [
          {
            "text": "provide detailed evidence;"
          }
        ],
        [
          {
            "text": "mediate disputes."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform trust and safety take priority."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. REGULATORY & LEGAL REPORTING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where required, DXB Deal Flow may report serious concerns to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "regulatory bodies;"
          }
        ],
        [
          {
            "text": "legal authorities;"
          }
        ],
        [
          {
            "text": "fraud prevention agencies;"
          }
        ],
        [
          {
            "text": "UAE government entities."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Particularly where fraud, impersonation, or unlawful conduct is suspected."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. RESPONSE TIMES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow aims to review complaints within a reasonable timeframe."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "However:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No guaranteed response timeline exists."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Complex matters may require additional investigation."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may be updated periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Changes may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "platform growth;"
          }
        ],
        [
          {
            "text": "compliance needs;"
          }
        ],
        [
          {
            "text": "abuse trends;"
          }
        ],
        [
          {
            "text": "legal developments."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "14. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support & Complaints:",
          "bold": true
        },
        {
          "text": " support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "complaints may be reviewed;"
          }
        ],
        [
          {
            "text": "moderation decisions are discretionary;"
          }
        ],
        [
          {
            "text": "platform trust and integrity take priority."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const communityGuidelinesContent = {
  "route": "/community-guidelines",
  "label": "Community Guidelines",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – COMMUNITY GUIDELINES",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "The DXB Deal Flow Standard",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is built on:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Trust. Quality. Relationships. Professionalism.",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This is a private network for serious professionals."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. RESPECT BROKER RELATIONSHIPS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "If someone introduces:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "a deal;"
          }
        ],
        [
          {
            "text": "a buyer;"
          }
        ],
        [
          {
            "text": "an owner;"
          }
        ],
        [
          {
            "text": "an opportunity;"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "act professionally."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No bad-faith circumvention."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. KEEP LISTINGS REAL",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Upload:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "genuine inventory"
          }
        ],
        [
          {
            "text": "current stock"
          }
        ],
        [
          {
            "text": "accurate pricing"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Do not upload:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "fake listings"
          }
        ],
        [
          {
            "text": "sold inventory"
          }
        ],
        [
          {
            "text": "misleading deals"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. NO SPAM",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "mass messaging"
          }
        ],
        [
          {
            "text": "irrelevant promotions"
          }
        ],
        [
          {
            "text": "aggressive pitching"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Be commercially relevant."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. KEEP IT PROFESSIONAL",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Treat others with respect."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "harassment"
          }
        ],
        [
          {
            "text": "abuse"
          }
        ],
        [
          {
            "text": "intimidation"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. QUALITY OVER QUANTITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Better listings receive better results."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Complete profiles and strong listings win."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. HELP BUILD THE NETWORK",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow works when users contribute quality opportunities."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The stronger the network:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "the better the deal flow."
        }
      ]
    }
  ]
} satisfies LegalPageContent;

export const acceptableUsePolicyContent = {
  "route": "/acceptable-use-policy",
  "label": "Acceptable Use Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – ACCEPTABLE USE POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a private professional ecosystem built for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Licensed Real Estate Brokers"
          }
        ],
        [
          {
            "text": "Verified Investors"
          }
        ],
        [
          {
            "text": "Strategic Partners"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Acceptable Use Policy (“Policy”) sets out the rules and behavioural standards expected from all users."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The purpose of this Policy is to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "maintain trust;"
          }
        ],
        [
          {
            "text": "protect brokers;"
          }
        ],
        [
          {
            "text": "preserve platform quality;"
          }
        ],
        [
          {
            "text": "reduce spam;"
          }
        ],
        [
          {
            "text": "prevent abuse;"
          }
        ],
        [
          {
            "text": "encourage ethical collaboration."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, you agree to comply with this Policy."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Failure to comply may result in:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "warnings;"
          }
        ],
        [
          {
            "text": "restrictions;"
          }
        ],
        [
          {
            "text": "suspension;"
          }
        ],
        [
          {
            "text": "permanent removal."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. PROFESSIONAL CONDUCT EXPECTATIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are expected to conduct themselves professionally at all times."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "All interactions should remain:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "respectful;"
          }
        ],
        [
          {
            "text": "professional;"
          }
        ],
        [
          {
            "text": "truthful;"
          }
        ],
        [
          {
            "text": "commercially ethical."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users must not engage in behaviour that damages:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "trust;"
          }
        ],
        [
          {
            "text": "platform integrity;"
          }
        ],
        [
          {
            "text": "broker relationships;"
          }
        ],
        [
          {
            "text": "user safety."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. PROHIBITED ACTIVITIES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The following conduct is prohibited."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "A. FALSE OR MISLEADING INFORMATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "upload fake listings;"
          }
        ],
        [
          {
            "text": "advertise unavailable inventory;"
          }
        ],
        [
          {
            "text": "falsely claim exclusivity;"
          }
        ],
        [
          {
            "text": "manipulate pricing;"
          }
        ],
        [
          {
            "text": "exaggerate returns;"
          }
        ],
        [
          {
            "text": "fabricate urgency;"
          }
        ],
        [
          {
            "text": "misrepresent mandates."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples include:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "“Distressed deal” with no distressed seller"
          }
        ],
        [
          {
            "text": "Fake below-market pricing"
          }
        ],
        [
          {
            "text": "Non-existent owner approval"
          }
        ],
        [
          {
            "text": "Already sold inventory uploaded as active"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated violations may result in permanent removal."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "B. SPAM & UNSOLICITED ACTIVITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "mass-message brokers;"
          }
        ],
        [
          {
            "text": "send repetitive sales outreach;"
          }
        ],
        [
          {
            "text": "abuse messaging tools;"
          }
        ],
        [
          {
            "text": "overload users with irrelevant communication;"
          }
        ],
        [
          {
            "text": "promote unrelated services excessively."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples include:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "Bulk WhatsApp harvesting"
          }
        ],
        [
          {
            "text": "Copy-paste sales spam"
          }
        ],
        [
          {
            "text": "Excessive financing promotions"
          }
        ],
        [
          {
            "text": "Unsolicited investment offers"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is not a lead scraping tool."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "C. CONTACT SCRAPING & DATA HARVESTING",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "scrape broker contact details;"
          }
        ],
        [
          {
            "text": "download user information;"
          }
        ],
        [
          {
            "text": "create databases from platform users;"
          }
        ],
        [
          {
            "text": "export data without permission;"
          }
        ],
        [
          {
            "text": "use automated collection tools."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This includes attempts to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "bypass platform protections;"
          }
        ],
        [
          {
            "text": "harvest WhatsApp numbers;"
          }
        ],
        [
          {
            "text": "build external marketing databases."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Violations may result in:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Immediate permanent suspension."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "D. HARASSMENT & ABUSIVE CONDUCT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "threaten others;"
          }
        ],
        [
          {
            "text": "intimidate users;"
          }
        ],
        [
          {
            "text": "bully brokers;"
          }
        ],
        [
          {
            "text": "use discriminatory language;"
          }
        ],
        [
          {
            "text": "harass investors;"
          }
        ],
        [
          {
            "text": "abuse platform staff."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples include:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "aggressive commission disputes"
          }
        ],
        [
          {
            "text": "abusive messages"
          }
        ],
        [
          {
            "text": "discriminatory remarks"
          }
        ],
        [
          {
            "text": "repeated harassment"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow operates a "
        },
        {
          "text": "zero tolerance policy",
          "bold": true
        },
        {
          "text": " for abuse."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "E. BROKER CIRCUMVENTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not intentionally bypass brokers introduced through the Platform."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This includes:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "contacting owners directly;"
          }
        ],
        [
          {
            "text": "avoiding introducing brokers;"
          }
        ],
        [
          {
            "text": "exploiting listing information unfairly;"
          }
        ],
        [
          {
            "text": "bypassing agreed co-broke relationships."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform trust depends on ethical behaviour."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where credible evidence exists of intentional circumvention:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "suspend accounts;"
          }
        ],
        [
          {
            "text": "permanently remove users;"
          }
        ],
        [
          {
            "text": "restrict future access."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "F. PLATFORM MANIPULATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not attempt to manipulate the Platform."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "duplicate listings;"
          }
        ],
        [
          {
            "text": "fake engagement;"
          }
        ],
        [
          {
            "text": "misleading enquiries;"
          }
        ],
        [
          {
            "text": "artificial urgency;"
          }
        ],
        [
          {
            "text": "multiple fake accounts."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "impersonate brokers;"
          }
        ],
        [
          {
            "text": "falsify credentials;"
          }
        ],
        [
          {
            "text": "create duplicate identities."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "G. FRAUDULENT ACTIVITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Fraudulent conduct is strictly prohibited."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "identity fraud;"
          }
        ],
        [
          {
            "text": "forged documentation;"
          }
        ],
        [
          {
            "text": "false licensing;"
          }
        ],
        [
          {
            "text": "payment scams;"
          }
        ],
        [
          {
            "text": "fake opportunities;"
          }
        ],
        [
          {
            "text": "deceptive investment claims."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may report fraudulent activity to relevant authorities."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. LISTING STANDARDS",
          "bold": true
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Accurate",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Correct pricing, location, availability."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Honest",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No misleading statements."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Current",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Outdated stock must be removed promptly."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Professionally Presented",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Reasonable imagery and descriptions."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Listings may be removed where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "inaccurate;"
          }
        ],
        [
          {
            "text": "duplicated;"
          }
        ],
        [
          {
            "text": "incomplete;"
          }
        ],
        [
          {
            "text": "misleading;"
          }
        ],
        [
          {
            "text": "poor quality."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. BUYER REQUIREMENTS RULES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Buyer requirements must represent:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "genuine demand."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "fabricate buyers;"
          }
        ],
        [
          {
            "text": "misrepresent budgets;"
          }
        ],
        [
          {
            "text": "create fake urgency;"
          }
        ],
        [
          {
            "text": "manipulate inventory responses."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated misuse may result in removal of posting privileges."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. ACCEPTABLE COMMUNICATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform messaging should be used for:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "✅",
      "items": [
        [
          {
            "text": "Deal discussions"
          }
        ],
        [
          {
            "text": "Listing enquiries"
          }
        ],
        [
          {
            "text": "Buyer matching"
          }
        ],
        [
          {
            "text": "Documentation requests"
          }
        ],
        [
          {
            "text": "Professional collaboration"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Communication should remain:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "respectful;"
          }
        ],
        [
          {
            "text": "commercially relevant;"
          }
        ],
        [
          {
            "text": "professional."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. PROHIBITED COMMUNICATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not use DXB Deal Flow messaging for:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "spam marketing"
          }
        ],
        [
          {
            "text": "abusive language"
          }
        ],
        [
          {
            "text": "harassment"
          }
        ],
        [
          {
            "text": "scams"
          }
        ],
        [
          {
            "text": "misleading offers"
          }
        ],
        [
          {
            "text": "unrelated promotions"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "crypto promotions"
          }
        ],
        [
          {
            "text": "unrelated business schemes"
          }
        ],
        [
          {
            "text": "network marketing"
          }
        ],
        [
          {
            "text": "recruitment spam"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. INVESTOR CONDUCT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Verified investors agree to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "respect broker relationships;"
          }
        ],
        [
          {
            "text": "avoid circumvention;"
          }
        ],
        [
          {
            "text": "use information ethically;"
          }
        ],
        [
          {
            "text": "avoid aggressive broker solicitation."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Investor accounts may be restricted where misuse occurs."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. STRATEGIC PARTNER CONDUCT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Strategic partners may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "aggressively solicit brokers;"
          }
        ],
        [
          {
            "text": "misuse platform visibility;"
          }
        ],
        [
          {
            "text": "spam services."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Examples:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "excessive mortgage promotion"
          }
        ],
        [
          {
            "text": "repetitive legal sales outreach"
          }
        ],
        [
          {
            "text": "aggressive visa marketing"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Partnership access is a privilege."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. ENFORCEMENT ACTIONS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Warning",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Minor breaches."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Restriction",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Limited messaging or access."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Temporary Suspension",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Short-term removal."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Permanent Removal",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Serious or repeated violations."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Blacklisting",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Future registrations denied."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Enforcement decisions remain at DXB Deal Flow’s discretion."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. REPORTING MISUSE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may report misconduct by contacting:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Reports may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "screenshots;"
          }
        ],
        [
          {
            "text": "listing concerns;"
          }
        ],
        [
          {
            "text": "communication concerns;"
          }
        ],
        [
          {
            "text": "suspected fraud."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may investigate complaints where appropriate."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. POLICY UPDATES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may be updated periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Changes may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "platform growth;"
          }
        ],
        [
          {
            "text": "legal obligations;"
          }
        ],
        [
          {
            "text": "abuse prevention;"
          }
        ],
        [
          {
            "text": "new features."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance of updates."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": " support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, you acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "you understand this Policy;"
          }
        ],
        [
          {
            "text": "you agree to comply with it;"
          }
        ],
        [
          {
            "text": "failure to comply may result in suspension or termination."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const contentIntellectualPropertyPolicyContent = {
  "route": "/content-intellectual-property-policy",
  "label": "Content & Intellectual Property Policy",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – CONTENT & INTELLECTUAL PROPERTY POLICY",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow is a professional platform designed to facilitate:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "broker collaboration;"
          }
        ],
        [
          {
            "text": "off-market opportunities;"
          }
        ],
        [
          {
            "text": "buyer requirements;"
          }
        ],
        [
          {
            "text": "investment opportunities;"
          }
        ],
        [
          {
            "text": "professional property communication."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may upload and share:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "listings;"
          }
        ],
        [
          {
            "text": "photographs;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "floorplans;"
          }
        ],
        [
          {
            "text": "videos;"
          }
        ],
        [
          {
            "text": "marketing materials;"
          }
        ],
        [
          {
            "text": "investment content;"
          }
        ],
        [
          {
            "text": "descriptions."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy explains:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "ownership rights;"
          }
        ],
        [
          {
            "text": "permitted usage;"
          }
        ],
        [
          {
            "text": "restrictions;"
          }
        ],
        [
          {
            "text": "intellectual property protections;"
          }
        ],
        [
          {
            "text": "content removal rights."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By using DXB Deal Flow, you agree to this Policy."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. CONTENT OWNERSHIP",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users retain ownership of content they upload."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This includes:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "listing images;"
          }
        ],
        [
          {
            "text": "property descriptions;"
          }
        ],
        [
          {
            "text": "floorplans;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "investment summaries;"
          }
        ],
        [
          {
            "text": "videos;"
          }
        ],
        [
          {
            "text": "renders;"
          }
        ],
        [
          {
            "text": "marketing materials."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Uploading content does not transfer ownership to DXB Deal Flow."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "User Responsibility",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users confirm they:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "have the legal right to upload any content submitted."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This means users must have permission to use:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "photographs;"
          }
        ],
        [
          {
            "text": "renders;"
          }
        ],
        [
          {
            "text": "developer materials;"
          }
        ],
        [
          {
            "text": "videos;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "marketing assets."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain solely responsible for copyright compliance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. PLATFORM LICENCE TO USE CONTENT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By uploading content to DXB Deal Flow, users grant DXB Deal Flow a:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "non-exclusive, worldwide, royalty-free licence",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "to use content for legitimate platform purposes."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This includes the right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "display listings;"
          }
        ],
        [
          {
            "text": "resize media;"
          }
        ],
        [
          {
            "text": "optimise presentation;"
          }
        ],
        [
          {
            "text": "feature content;"
          }
        ],
        [
          {
            "text": "promote listings;"
          }
        ],
        [
          {
            "text": "market opportunities;"
          }
        ],
        [
          {
            "text": "showcase platform activity."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This licence exists solely for:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "platform operation, moderation, and marketing purposes",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "and does not transfer ownership."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Marketing Usage",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may use uploaded content for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "deal alerts;"
          }
        ],
        [
          {
            "text": "newsletters;"
          }
        ],
        [
          {
            "text": "social media;"
          }
        ],
        [
          {
            "text": "broker promotion;"
          }
        ],
        [
          {
            "text": "featured opportunities;"
          }
        ],
        [
          {
            "text": "platform advertising."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Where practical, attribution may be provided."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. PROHIBITED CONTENT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not upload content that:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "A. Infringes Copyright",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "stolen brochures;"
          }
        ],
        [
          {
            "text": "unauthorised renders;"
          }
        ],
        [
          {
            "text": "copied listings;"
          }
        ],
        [
          {
            "text": "third-party marketing material without permission."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "B. Violates Confidentiality",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "private owner information;"
          }
        ],
        [
          {
            "text": "passports;"
          }
        ],
        [
          {
            "text": "title deeds without permission;"
          }
        ],
        [
          {
            "text": "financial statements;"
          }
        ],
        [
          {
            "text": "confidential legal documents."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "C. Misrepresents Opportunities",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "edited images intended to mislead;"
          }
        ],
        [
          {
            "text": "inaccurate visuals;"
          }
        ],
        [
          {
            "text": "deceptive renderings."
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "D. Illegal or Offensive Content",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "unlawful material;"
          }
        ],
        [
          {
            "text": "offensive imagery;"
          }
        ],
        [
          {
            "text": "discriminatory content;"
          }
        ],
        [
          {
            "text": "prohibited marketing."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. BROKER CONTENT PROTECTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow recognises that brokers invest significant time and resources into:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "sourcing inventory;"
          }
        ],
        [
          {
            "text": "photography;"
          }
        ],
        [
          {
            "text": "content creation;"
          }
        ],
        [
          {
            "text": "investment analysis."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "copy listings without permission;"
          }
        ],
        [
          {
            "text": "steal descriptions;"
          }
        ],
        [
          {
            "text": "republish broker content;"
          }
        ],
        [
          {
            "text": "misrepresent ownership of content."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Repeated abuse may result in:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "suspension or permanent removal."
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Listing Copying Restrictions",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not intentionally:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "duplicate another broker’s listing;"
          }
        ],
        [
          {
            "text": "copy investment analysis;"
          }
        ],
        [
          {
            "text": "republish private opportunities;"
          }
        ],
        [
          {
            "text": "recreate confidential inventory posts."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Platform moderation may remove duplicate or copied content."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. DEVELOPER CONTENT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Certain listings may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "developer renders;"
          }
        ],
        [
          {
            "text": "brochures;"
          }
        ],
        [
          {
            "text": "floorplans;"
          }
        ],
        [
          {
            "text": "launch materials."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users are responsible for ensuring permission exists to use such materials."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow accepts no liability for unauthorised usage by users."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. PLATFORM INTELLECTUAL PROPERTY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The following remain exclusive intellectual property of DXB Deal Flow and/or Veer & Sant Real Estate L.L.C:"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Branding",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "DXB Deal Flow name"
          }
        ],
        [
          {
            "text": "logos"
          }
        ],
        [
          {
            "text": "trademarks"
          }
        ],
        [
          {
            "text": "visual identity"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Technology",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "workflows"
          }
        ],
        [
          {
            "text": "user systems"
          }
        ],
        [
          {
            "text": "dashboards"
          }
        ],
        [
          {
            "text": "ranking logic"
          }
        ],
        [
          {
            "text": "moderation systems"
          }
        ],
        [
          {
            "text": "matching functionality"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Design Assets",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "layouts"
          }
        ],
        [
          {
            "text": "platform design"
          }
        ],
        [
          {
            "text": "UI systems"
          }
        ],
        [
          {
            "text": "interaction flows"
          }
        ],
        [
          {
            "text": "feature structures"
          }
        ]
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Written Content",
          "bold": true
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "website copy"
          }
        ],
        [
          {
            "text": "documentation"
          }
        ],
        [
          {
            "text": "platform text"
          }
        ],
        [
          {
            "text": "marketing content"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not copy, reproduce, or commercially exploit DXB Deal Flow intellectual property without written permission."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. PLATFORM SCRAPING & AUTOMATION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may not:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "scrape listings;"
          }
        ],
        [
          {
            "text": "harvest broker data;"
          }
        ],
        [
          {
            "text": "extract content automatically;"
          }
        ],
        [
          {
            "text": "use bots;"
          }
        ],
        [
          {
            "text": "use AI scraping systems;"
          }
        ],
        [
          {
            "text": "mass download opportunities."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Including:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "browser scraping"
          }
        ],
        [
          {
            "text": "automated exports"
          }
        ],
        [
          {
            "text": "contact harvesting"
          }
        ],
        [
          {
            "text": "mirrored databases"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Violations may result in:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "immediate permanent suspension and legal action where appropriate."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. COPYRIGHT COMPLAINTS & REMOVAL REQUESTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "If a user believes content infringes their rights, they may contact:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "support@dxbdealflow.com",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Complaints should include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "content details;"
          }
        ],
        [
          {
            "text": "ownership evidence;"
          }
        ],
        [
          {
            "text": "supporting explanation."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow may:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "investigate claims;"
          }
        ],
        [
          {
            "text": "temporarily remove content;"
          }
        ],
        [
          {
            "text": "permanently remove listings;"
          }
        ],
        [
          {
            "text": "restrict offending users."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. REMOVAL RIGHTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the unrestricted right to remove content where:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "copyright concerns arise;"
          }
        ],
        [
          {
            "text": "misleading information exists;"
          }
        ],
        [
          {
            "text": "moderation concerns emerge;"
          }
        ],
        [
          {
            "text": "legal risk exists;"
          }
        ],
        [
          {
            "text": "trust is compromised."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Removal decisions remain discretionary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "11. NO LIABILITY FOR USER CONTENT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users acknowledge that:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow does not independently verify all uploaded materials."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain solely responsible for:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "accuracy;"
          }
        ],
        [
          {
            "text": "permissions;"
          }
        ],
        [
          {
            "text": "ownership rights;"
          }
        ],
        [
          {
            "text": "copyright compliance."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow shall not be liable for disputes relating to uploaded content."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "12. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "This Policy may change periodically."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Updates may reflect:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "platform growth;"
          }
        ],
        [
          {
            "text": "legal requirements;"
          }
        ],
        [
          {
            "text": "content protection needs;"
          }
        ],
        [
          {
            "text": "technology changes."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued use constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "13. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": " support@dxbdealflow.com"
        }
      ]
    },
    {
      "type": "subheading",
      "content": [
        {
          "text": "Final Acknowledgement",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "By uploading or accessing content on DXB Deal Flow, users acknowledge that:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "content rights remain protected;"
          }
        ],
        [
          {
            "text": "unauthorised copying is prohibited;"
          }
        ],
        [
          {
            "text": "platform content may be moderated;"
          }
        ],
        [
          {
            "text": "misuse may result in suspension or removal."
          }
        ]
      ]
    }
  ]
} satisfies LegalPageContent;

export const foundingMemberTermsContent = {
  "route": "/founding-member-terms",
  "label": "Founding Member Terms",
  "blocks": [
    {
      "type": "title",
      "content": [
        {
          "text": "DXB DEAL FLOW – FOUNDING MEMBER TERMS",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "Effective Date:",
            "bold": true
          },
          {
            "text": " [Insert Date]"
          }
        ],
        [
          {
            "text": "Platform:",
            "bold": true
          },
          {
            "text": " DXB Deal Flow"
          }
        ],
        [
          {
            "text": "Operated By:",
            "bold": true
          },
          {
            "text": " Veer & Sant Real Estate L.L.C"
          }
        ],
        [
          {
            "text": "Support Contact:",
            "bold": true
          },
          {
            "text": " support@dxbdealflow.com"
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "1. INTRODUCTION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "The DXB Deal Flow Founding Member Programme is intended to recognise and reward early users who support the Platform during its launch and early growth phase."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status may provide access to selected benefits, visibility, incentives, and early opportunities."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "These Terms explain:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "eligibility;"
          }
        ],
        [
          {
            "text": "benefits;"
          }
        ],
        [
          {
            "text": "limitations;"
          }
        ],
        [
          {
            "text": "expectations."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status is discretionary and subject to these Terms."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "2. ELIGIBILITY",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status may be offered to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "licensed brokers;"
          }
        ],
        [
          {
            "text": "verified investors;"
          }
        ],
        [
          {
            "text": "strategic partners;"
          }
        ],
        [
          {
            "text": "approved early users."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Eligibility is determined solely by DXB Deal Flow."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Registration alone does not guarantee Founding Member status."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "3. POTENTIAL BENEFITS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Members may receive access to benefits including:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "early platform access;"
          }
        ],
        [
          {
            "text": "priority onboarding;"
          }
        ],
        [
          {
            "text": "social media recognition;"
          }
        ],
        [
          {
            "text": "early feature access;"
          }
        ],
        [
          {
            "text": "visibility boosts;"
          }
        ],
        [
          {
            "text": "preferred launch access;"
          }
        ],
        [
          {
            "text": "priority support;"
          }
        ],
        [
          {
            "text": "promotional opportunities."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Benefits may vary between users."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No guarantee exists that all Founding Members will receive identical benefits."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "4. SOCIAL MEDIA RECOGNITION",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users who voluntarily provide:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Instagram handles;"
          }
        ],
        [
          {
            "text": "LinkedIn profiles;"
          }
        ],
        [
          {
            "text": "professional branding;"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "may receive public recognition as:"
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "“Founding Members of DXB Deal Flow”",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Recognition may include:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "Instagram posts;"
          }
        ],
        [
          {
            "text": "LinkedIn mentions;"
          }
        ],
        [
          {
            "text": "stories;"
          }
        ],
        [
          {
            "text": "launch promotions;"
          }
        ],
        [
          {
            "text": "founder spotlights."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Participation is voluntary."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users may request removal from promotional activity."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "5. NO GUARANTEED COMMERCIAL BENEFIT",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status does "
        },
        {
          "text": "not guarantee",
          "bold": true
        },
        {
          "text": ":"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "listings"
          }
        ],
        [
          {
            "text": "commissions"
          }
        ],
        [
          {
            "text": "referrals"
          }
        ],
        [
          {
            "text": "deal flow"
          }
        ],
        [
          {
            "text": "exclusivity"
          }
        ],
        [
          {
            "text": "revenue"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Benefits remain discretionary."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "6. CHANGES TO BENEFITS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the unrestricted right to:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "modify benefits;"
          }
        ],
        [
          {
            "text": "remove incentives;"
          }
        ],
        [
          {
            "text": "introduce new perks;"
          }
        ],
        [
          {
            "text": "discontinue programmes."
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Benefits may change as the Platform evolves."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "No benefit is guaranteed permanently."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "7. NO OWNERSHIP RIGHTS",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status does not create:"
        }
      ]
    },
    {
      "type": "symbolList",
      "symbol": "❌",
      "items": [
        [
          {
            "text": "ownership rights"
          }
        ],
        [
          {
            "text": "equity entitlement"
          }
        ],
        [
          {
            "text": "revenue share"
          }
        ],
        [
          {
            "text": "voting rights"
          }
        ],
        [
          {
            "text": "partnership rights"
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Users remain platform members only."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "8. MISUSE",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Founding Member status may be revoked where users:"
        }
      ]
    },
    {
      "type": "list",
      "items": [
        [
          {
            "text": "abuse access;"
          }
        ],
        [
          {
            "text": "damage platform reputation;"
          }
        ],
        [
          {
            "text": "breach policies;"
          }
        ],
        [
          {
            "text": "harass members;"
          }
        ],
        [
          {
            "text": "misuse incentives."
          }
        ]
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "9. POLICY CHANGES",
          "bold": true
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "DXB Deal Flow reserves the right to amend this programme at any time."
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Continued participation constitutes acceptance."
        }
      ]
    },
    {
      "type": "heading",
      "content": [
        {
          "text": "10. CONTACT",
          "bold": true
        }
      ]
    },
    {
      "type": "lines",
      "lines": [
        [
          {
            "text": "DXB Deal Flow",
            "bold": true
          }
        ],
        [
          {
            "text": "Operated by: "
          },
          {
            "text": "Veer & Sant Real Estate L.L.C",
            "bold": true
          }
        ]
      ]
    },
    {
      "type": "paragraph",
      "content": [
        {
          "text": "Support:",
          "bold": true
        },
        {
          "text": " support@dxbdealflow.com"
        }
      ]
    }
  ]
} satisfies LegalPageContent;

