// Sütunların və tapşırıqların sırasını saxlamaq üçün köməkçi.
// ids = düzgün sıra ilə id massivi. Hər elementin position-u onun indeksi olur (0, 1, 2 ...).
// Tək sorğu ilə bütün siyahını yeniləyir.
async function saveOrder(client, table, ids) {
    if (table !== 'columns' && table !== 'tasks') throw new Error('Yanlış cədvəl adı')
    if (ids.length === 0) return
    await client.query(
        `UPDATE ${table} AS t SET position = v.ord - 1
         FROM unnest($1::int[]) WITH ORDINALITY AS v(id, ord)
         WHERE t.id = v.id`,
        [ids]
    )
}

// ids siyahısına itemId-ni verilən indeksdə yerləşdirir (əvvəlki yerindən çıxarıb)
function insertAt(ids, itemId, index) {
    const list = ids.filter(id => id !== itemId)
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, list.length))
    list.splice(safeIndex, 0, itemId)
    return list
}

module.exports = { saveOrder, insertAt }
