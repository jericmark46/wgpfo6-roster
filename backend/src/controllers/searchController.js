import { getCollection, getHouseholdsCollection } from '../config/db.js';

const SEARCHABLE_FIELDS = [
  'hh_id',
  'first_name',
  'middle_name',
  'last_name',
  'province',
  'municipality',
  'barangay',
];

const PROJECTION = {
  _id: 0,
  hh_id: 1,
  last_name: 1,
  first_name: 1,
  middle_name: 1,
  ext_name: 1,
  birthdate: 1,
  sex: 1,
  province: 1,
  municipality: 1,
  barangay: 1,
};

const MAX_COUNT = 10000;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function searchMembers(req, res) {
  try {
    const values = {};
    for (const key of SEARCHABLE_FIELDS) {
      const raw = typeof req.query[key] === 'string' ? req.query[key].trim().slice(0, 100) : '';
      if (raw) values[key] = raw;
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    if (!Object.keys(values).length) {
      return res.json({
        data: [],
        total: 0,
        totalCapped: false,
        page,
        limit,
        totalPages: 0,
        took: 0,
      });
    }

    const startedAt = Date.now();
    const collection = getCollection();
    const sortKey = Object.keys(values)[0];
    const sort = { [sortKey]: 1, first_name: 1 };

    const filter = {
      $and: SEARCHABLE_FIELDS.filter((key) => values[key]).map((key) => {
        const value = values[key];
        if (key === 'hh_id') {
          return { hh_id: { $regex: `^${escapeRegex(value.replace(/\s+/g, ''))}` } };
        }
        return { [key]: { $regex: `^${escapeRegex(value.toUpperCase())}` } };
      }),
    };

    const execute = async (filter) => {
      const [data, counted] = await Promise.all([
        collection
          .find(filter, { projection: PROJECTION })
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .maxTimeMS(15000)
          .toArray(),
        collection
          .aggregate(
            [
              { $match: filter },
              { $limit: MAX_COUNT },
              { $group: { _id: null, n: { $sum: 1 } } },
            ],
            { maxTimeMS: 15000 },
          )
          .toArray(),
      ]);

      const total = counted[0]?.n || 0;
      return { data, total, totalCapped: total === MAX_COUNT };
    };

    const result = await execute(filter);

    return res.json({
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
      took: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('searchMembers error:', error);
    return res.status(500).json({ message: 'Search failed. Please try again.' });
  }
}

export async function getRoster(req, res) {
  try {
    const hhId = String(req.params.hhid || '').trim();

    if (!/^\d{1,20}$/.test(hhId)) {
      return res.status(400).json({ message: 'Invalid household ID.' });
    }

    const collection = getCollection();
    const members = await collection
      .find({ hh_id: hhId }, { projection: PROJECTION })
      .sort({ birthdate: 1, last_name: 1, first_name: 1 })
      .limit(100)
      .maxTimeMS(15000)
      .toArray();

    if (!members.length) {
      return res.status(404).json({ message: 'No roster found for this household ID.' });
    }

    const household = await getHouseholdsCollection().findOne(
      { hh_id: hhId },
      { projection: { _id: 0 } },
    );

    const head = members[0];

    return res.json({
      hh_id: hhId,
      count: household?.member_count ?? members.length,
      province: household?.province ?? head.province,
      municipality: household?.municipality ?? head.municipality,
      barangay: household?.barangay ?? head.barangay,
      members,
    });
  } catch (error) {
    console.error('getRoster error:', error);
    return res.status(500).json({ message: 'Could not load the family roster.' });
  }
}

export async function getStats(req, res) {
  try {
    const [members, households] = await Promise.all([
      getCollection().estimatedDocumentCount(),
      getHouseholdsCollection().estimatedDocumentCount(),
    ]);

    return res.json({ members, households });
  } catch (error) {
    console.error('getStats error:', error);
    return res.status(500).json({ message: 'Could not load statistics.' });
  }
}
