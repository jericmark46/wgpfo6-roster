import { getHouseholdsCollection } from '../config/db.js';

export async function getLocations(req, res) {
  try {
    const province = typeof req.query.province === 'string' ? req.query.province.trim() : '';
    const municipality = typeof req.query.municipality === 'string' ? req.query.municipality.trim() : '';

    const match = {};
    if (province) match.province = province;
    if (municipality) match.municipality = municipality;

    const collection = getHouseholdsCollection();
    const [provinces, municipalities, barangays] = await Promise.all([
      collection.distinct('province', {}, { maxTimeMS: 15000 }),
      province ? collection.distinct('municipality', { province }, { maxTimeMS: 15000 }) : [],
      province && municipality
        ? collection.distinct('barangay', { province, municipality }, { maxTimeMS: 15000 })
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
