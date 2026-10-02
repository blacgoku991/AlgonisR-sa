// Thème sombre par défaut ; le choix « clair » de l'utilisateur est mémorisé.
// (Fichier externe pour respecter la politique de sécurité du contenu : aucun script en ligne.)
try {
  if (localStorage.getItem("reza.theme") === "light") document.documentElement.classList.remove("dark");
} catch (e) {}
