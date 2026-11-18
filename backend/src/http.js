// Ortaq cavab köməkçiləri
// İcazəsiz əməliyyat üçün təhlükəsiz (heç bir daxili məlumat verməyən) 403 cavabı
function forbid(res) {
    return res.status(403).json({ error: 'Bu əməliyyat üçün icazən yoxdur' })
}

// Ad + soyad birlikdə (köhnə hesablarda soyad boşdur, ad isə tam adı saxlayır)
const FULL_NAME = (alias) => `TRIM(${alias}.name || ' ' || COALESCE(${alias}.surname, ''))`

module.exports = { forbid, FULL_NAME }
