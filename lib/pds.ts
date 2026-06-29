// Personal Data Sheet field config — drives the field-officer/installer form
// and the read-only display in HR's 201 files.

export interface PdsField {
  key: string;
  label: string;
  type?: "text" | "date" | "textarea";
}

export interface PdsSection {
  title: string;
  fields: PdsField[];
}

export const PDS_SECTIONS: PdsSection[] = [
  {
    title: "Personal Information",
    fields: [
      { key: "full_name", label: "Full name" },
      { key: "birthdate", label: "Date of birth", type: "date" },
      { key: "birthplace", label: "Place of birth" },
      { key: "civil_status", label: "Civil status" },
      { key: "gender", label: "Gender" },
      { key: "nationality", label: "Nationality" },
      { key: "contact_number", label: "Contact number" },
      { key: "present_address", label: "Present address", type: "textarea" },
    ],
  },
  {
    title: "Government IDs",
    fields: [
      { key: "sss", label: "SSS No." },
      { key: "philhealth", label: "PhilHealth No." },
      { key: "pagibig", label: "Pag-IBIG No." },
      { key: "tin", label: "TIN" },
    ],
  },
  {
    title: "Employment",
    fields: [
      { key: "position", label: "Position" },
      { key: "date_hired", label: "Date hired", type: "date" },
      { key: "education", label: "Educational attainment" },
    ],
  },
];

export const PDS_EMERGENCY: PdsSection = {
  title: "In Case of Emergency",
  fields: [
    { key: "em_name", label: "Contact person" },
    { key: "em_relationship", label: "Relationship" },
    { key: "em_contact", label: "Contact number" },
    { key: "em_address", label: "Address", type: "textarea" },
  ],
};

export const PDS_ALL_SECTIONS: PdsSection[] = [...PDS_SECTIONS, PDS_EMERGENCY];

export type PdsValues = Record<string, string>;
