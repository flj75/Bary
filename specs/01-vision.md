# 01 — Vision & Objectifs

## Le problème

Entre amis dans une grande ville, organiser un rendez-vous à plus de deux personnes pose toujours la même question : **où se retrouver ?** La réponse intuitive ("on se retrouve au centre") est souvent biaisée — elle favorise ceux qui sont déjà bien placés, et laisse toujours quelqu'un avec un trajet plus long que les autres. Le sentiment d'iniquité est fréquent, même inconscient.

## La solution

Bary calcule le **point de rencontre le plus équitable** pour un groupe. Pas le plus central géographiquement, mais celui où **la personne la plus loin met le moins de temps possible** — l'équité au sens mathématique du terme.

## Objectifs MVP

1. Permettre à un utilisateur de constituer un groupe (2 à N personnes) en sélectionnant leur station de départ dans le réseau Métro/RER/Tram Île-de-France.
2. Calculer et afficher la station de rencontre optimale selon le critère minimax.
3. Afficher le temps de trajet estimé de chaque participant vers la station résultat.
4. Permettre de partager le résultat via un lien encodé.
5. Sauvegarder un carnet d'amis (nom + station par défaut) pour accélérer les prochaines sessions.

## Ce qui est hors scope MVP

- Suggestions de bars, restaurants, cafés à proximité
- Géolocalisation GPS ou saisie d'adresse libre
- Modes de transport autres que RATP (à pied, vélo, voiture)
- Comptes utilisateur / authentification
- Lien de partage en temps réel (chaque ami entre sa propre position)
- Partage natif WhatsApp / iMessage

## Audience cible

Jeunes actifs urbains (20-35 ans), habitués des apps mobiles, utilisateurs réguliers du métro parisien. Cas d'usage principal : organiser une soirée ou un apéro improvisé entre amis dispersés dans Paris.

## Promesse de valeur en une phrase

> "Bary trouve l'endroit où personne n'est lésé."

## Roadmap post-MVP

| Version | Fonctionnalité |
|---|---|
| v2 | Mode hybride : chaque participant choisit son propre moyen de transport |
| v3 | Suggestions de lieux à proximité de la station résultat |
| v4 | Autres villes / réseaux de transport |
| v5 | Gestion d'amis avec comptes, dimension réseau social |
