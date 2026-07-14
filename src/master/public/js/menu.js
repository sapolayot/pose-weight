function initMenuCards() {
  var cards = document.querySelectorAll(".menu-card[href='#']");
  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener("click", function(event) {
      event.preventDefault();
      alert("\u0E40\u0E21\u0E19\u0E39\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1E\u0E31\u0E12\u0E19\u0E32");
    });
  }
}
document.addEventListener("DOMContentLoaded", function() {
  initWelcomeText();
  initMenuCards();
});
