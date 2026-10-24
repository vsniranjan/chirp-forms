// Shared label dictionary. Every phone ships the same list, so a label costs 1 byte on the wire.
// APPEND ONLY: reordering or removing entries breaks compatibility with phones on older builds.
// Indexes 0..30 can be packed into a field byte; keep the most common field labels there.
export const LABELS = [
  'House no', //  0
  'People', //  1
  'Children', //  2
  'Elderly', //  3
  'Injured', //  4
  'Missing', //  5
  'Water', //  6
  'Food', //  7
  'Shelter', //  8
  'Medical', //  9
  'Power', // 10
  'Notes', // 11
  'Name', // 12
  'Phone', // 13
  'Location', // 14
  'Village', // 15
  'Ward', // 16
  'Age', // 17
  'Gender', // 18
  'Pregnant', // 19
  'Disabled', // 20
  'Livestock', // 21
  'Damage', // 22
  'Urgent need', // 23
  'Priority', // 24
  'Safe', // 25
  'Trapped', // 26
  'Deceased', // 27
  'Road access', // 28
  'Sanitation', // 29
  'Count', // 30
  // ---- 31+ : options, titles, less common labels
  'Rapid Needs', // 31
  'Low', // 32
  'Medium', // 33
  'High', // 34
  'Critical', // 35
  'None', // 36
  'Partial', // 37
  'Full', // 38
  'Destroyed', // 39
  'Male', // 40
  'Female', // 41
  'Other', // 42
  'Head count', // 43
  'Roll call', // 44
];

export const LABEL_INDEX = new Map(LABELS.map((l, i) => [l.toLowerCase(), i]));

export const PRESETS = {
  rapidNeeds: {
    title: 'Rapid Needs',
    fields: [
      { type: 'number', label: 'House no' },
      { type: 'number', label: 'People' },
      { type: 'number', label: 'Injured' },
      { type: 'yesno', label: 'Water' },
      { type: 'choice', label: 'Urgent need', options: ['Water', 'Food', 'Shelter', 'Medical'] },
      { type: 'text', label: 'Notes' },
    ],
  },
};
