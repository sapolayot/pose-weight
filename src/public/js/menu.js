function initMenuCards() {
  var cards = document.querySelectorAll(".menu-card[href='#']");
  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener("click", function (event) {
      event.preventDefault();
      alert("เมนูนี้อยู่ระหว่างพัฒนา");
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initWelcomeText();
  initMenuCards();
});
