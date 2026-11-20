import { getHouseholdsCollection } from '../config/db.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (value) => ({ $regex: `^${escapeRegex(value)}$`, $options: 'i' });

export async function getLocations(req, res) {
  try {
    const province = typeof req.query.province === 'string' ? req.query.province.trim() : '';
    const municipality = typeof req.query.municipality === 'string' ? req.query.municipality.trim() : '';

    const provinceMatch = {};
    if (province) provinceMatch.province = exact(province);

    const municipalityMatch = { ...provinceMatch };
    if (municipality) municipalityMatch.municipality = exact(municipality);

    const collection = getHouseholdsCollection();
    const [provinces, municipalities, barangays] = await Promise.all([
      collection.distinct('province', {}, { maxTimeMS: 15000 }),
      collection.distinct('municipality', provinceMatch, { maxTimeMS: 15000 }),
      municipality
        ? collection.distinct('barangay', municipalityMatch, { maxTimeMS: 15000 })
        : [],
    ]);

    const clean = (values) =>
      values
        .filter((value) => typeof value === 'string' && value.trim())
        .sort((a, b) => a.localeCompare(b));

    return res.json({
      provinces: clean(provinces),
      municipalities: clean(municipalities),
      barangays: clean(barangays),
    });
  } catch (error) {
    console.error('getLocations error:', error);
    return res.status(500).json({ message: 'Could not load location options.' });
  }
}
