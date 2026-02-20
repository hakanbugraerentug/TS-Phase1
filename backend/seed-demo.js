// Demo için seed verisi — MongoDB'ye hakanerentug kullanıcısını ekler
// Çalıştırmak için: mongosh TeamSyncDb seed-demo.js

db.users.insertOne({
  username: "hakanerentug",
  fullName: "Hakan Erentuğ",
  employeeId: "EMP-001"
});
