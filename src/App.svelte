<!-- 
This tells the Svelte compiler that this file is a custom element. 
We also have to include the "customElement: true" compiler setting in rollup configuration.
-->
<svelte:options tag="modal-element" />

<script>

  import { fade } from "svelte/transition";

  export let id = "";
  export let show = false;
  export let durationCapture = true;
  export let width = "600px";
  export let height = "400px";
  export let hour12card;
  export let hour24card;
  export let minutecard;
  export let durationcard;
  export let minutedisplay;
  export let hourdisplay;
  export let durationdisplay;
  export let durTextBox;
  export let hourTextBox;
  export let minuteTextBox;
  export let cmbBoxHour;
  export let cmbBoxMinute;

  export function setDuration(cbdr, cbhr, cbmn) { 
    
    console.log(cbdr.value, cbhr.value, cbmn.value);

    durTextBox.value = document.getElementById('sduration').value
    hourTextBox.value = document.getElementById('shour').value
    minuteTextBox.value = document.getElementById('smin').value
    
    durationdisplay.innerHTML = document.getElementById('sduration').value
    hourdisplay.innerHTML = document.getElementById('shour').value
    minutedisplay.innerHTML = document.getElementById('smin').value

  }


  export function initializeTimePicker(){
    hour24panel();
  }

  function close(e) {
 
    //console.log(durTextBox.value, hourTextBox.value, minuteTextBox.value) //debug

    document.getElementById('sduration').value = durTextBox.value;
    document.getElementById('shour').value = hourTextBox.value;
    document.getElementById('smin').value = minuteTextBox.value;


    dispatchCloseEvent.call(this, e);
    show = false;
  }

  function dispatchCloseEvent(e) {
    // 1. Create the custom event.
    const event = new CustomEvent("close", {
      detail: `modal-element was closed.`,
      bubbles: true,
      cancelable: true,
      composed: true, // makes the event jump shadow DOM boundary
    });

    // 2. Dispatch the custom event.
    this.dispatchEvent(event);
  }

  let closePath = `M28.228,23.986L47.092,5.122c1.172-1.171,1.172-3.071,0-4.242c-1.172-1.172-3.07-1.172-4.242,0L23.986,19.744L5.121,0.88
          c-1.172-1.172-3.07-1.172-4.242,0c-1.172,1.171-1.172,3.071,0,4.242l18.865,18.864L0.879,42.85c-1.172,1.171-1.172,3.071,0,4.242
          C1.465,47.677,2.233,47.97,3,47.97s1.535-0.293,2.121-0.879l18.865-18.864L42.85,47.091c0.586,0.586,1.354,0.879,2.121,0.879
          s1.535-0.293,2.121-0.879c1.172-1.171,1.172-3.071,0-4.242L28.228,23.986z`;

  // Time-Picker below

  // apply CSS to selected minute
  //
  let selected_00m = "";
  let selected_05m = "";
  let selected_10m = "";
  let selected_15m = "";
  let selected_20m = "";
  let selected_25m = "";
  let selected_30m = "";
  let selected_35m = "";
  let selected_40m = "";
  let selected_45m = "";
  let selected_50m = "";
  let selected_55m = "";

  // apply CSS to selected 12-hour
  //
  let selected_00h = "";
  let selected_01h = "";
  let selected_02h = "";
  let selected_03h = "";
  let selected_04h = "";
  let selected_05h = "";
  let selected_06h = "";
  let selected_07h = "";
  let selected_08h = "";
  let selected_09h = "";
  let selected_10h = "";
  let selected_11h = "";
  let selected_12h = "";

  // apply CSS to selected 24-hour
  //
  let selected_13h = "";
  let selected_14h = "";
  let selected_15h = "";
  let selected_16h = "";
  let selected_17h = "";
  let selected_18h = "";
  let selected_19h = "";
  let selected_20h = "";
  let selected_21h = "";
  let selected_22h = "";
  let selected_23h = "";

  const clearAllSelected = async () => {
    selected_00m = "";
    selected_05m = "";
    selected_10m = "";
    selected_15m = "";
    selected_20m = "";
    selected_25m = "";
    selected_30m = "";
    selected_35m = "";
    selected_40m = "";
    selected_45m = "";
    selected_50m = "";
    selected_55m = "";

    selected_00h = "";
    selected_01h = "";
    selected_02h = "";
    selected_03h = "";
    selected_04h = "";
    selected_05h = "";
    selected_06h = "";
    selected_07h = "";
    selected_08h = "";
    selected_09h = "";
    selected_10h = "";
    selected_11h = "";
    selected_12h = "";

    selected_13h = "";
    selected_14h = "";
    selected_15h = "";
    selected_16h = "";
    selected_17h = "";
    selected_18h = "";
    selected_19h = "";
    selected_20h = "";
    selected_21h = "";
    selected_22h = "";
    selected_23h = "";
  };


  const durationpanel = () => {
    //console.log('asdf')
    
   //$: durationCapture = !durationCapture;

   durationCapture = true;
    hour12card.hidden = false;
    hour24card.hidden = false;
    minutecard.hidden = true;

    hour24card.style.color = "white";
    minutecard.style.color = "#c79395";
    hour12card.style.color = "purple";

    //Header Display
    minutedisplay.style.color = "#e3cc59";
    hourdisplay.style.color = "#e3cc59";
    durationdisplay.style.color = "#9853c9";

  };


  const hour24panel = () => {
    durationCapture = false;
    hour12card.hidden = false;
    hour24card.hidden = false;
    minutecard.hidden = true;

    hour24card.style.color = "white";
    minutecard.style.color = "#eb4034";
    hour12card.style.color = "green";

    //Header Display
    durationdisplay.style.color = "#e3cc59";
    minutedisplay.style.color = "#e3cc59";
    hourdisplay.style.color = "#9853c9";

  }; //hour24panel

  const minutepanel = () => {
    durationCapture = false;
    // show Minutes Panel Only
    hour12card.hidden = true;
    hour24card.hidden = true;
    minutecard.hidden = false;
    durationdisplay.style.color = "#e3cc59";
    hourdisplay.style.color = "#e3cc59";
    minutedisplay.style.color = "#9853c9";
  };



  // --------------------------
  // DURATION handlers (1 - 24)
  // --------------------------

  const duration_00 = async () => {
    let temp = selected_00h === "" ? "circle-me" : "";
    await clearAllSelected();
    durationdisplay.innerHTML = "00";
    durTextBox.value = "00";
    selected_00h = temp;
  };



  // ---------------------
  // MINUTE handlers
  // ---------------------
  const minute_00 = async () => {
    let temp = selected_00m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "00";
    minuteTextBox.value = "00";
    selected_00m = temp;
  };

  const minute_05 = async () => {
    let temp = selected_05m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "05";
    minuteTextBox.value = "05";
    selected_05m = temp;
  };

  const minute_10 = async () => {
    let temp = selected_10m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "10";
    minuteTextBox.value = "10";
    selected_10m = temp;
  };

  const minute_15 = async () => {
    let temp = selected_15m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "15";
    minuteTextBox.value = "15";
    selected_15m = temp;
  };

  const minute_20 = async () => {
    let temp = selected_20m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "20";
    minuteTextBox.value = "20";
    selected_20m = temp;
  };

  const minute_25 = async () => {
    let temp = selected_25m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "25";
    minuteTextBox.value = "25";
    selected_25m = temp;
  };

  const minute_30 = async () => {
    let temp = selected_30m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "30";
    minuteTextBox.value = "30";
    selected_30m = temp;
  };

  const minute_35 = async () => {
    let temp = selected_35m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "35";
    minuteTextBox.value = "35";
    selected_35m = temp;
  };

  const minute_40 = async () => {
    let temp = selected_40m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "40";
    minuteTextBox.value = "40";
    selected_40m = temp;
  };

  const minute_45 = async () => {
    let temp = selected_45m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "45";
    minuteTextBox.value = "45";
    selected_45m = temp;
  };

  const minute_50 = async () => {
    let temp = selected_50m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "50";
    minuteTextBox.value = "50";
    selected_50m = temp;
  };

  const minute_55 = async () => {
    let temp = selected_55m === "" ? "circle-me" : "";
    await clearAllSelected();
    minutedisplay.innerHTML = "55";
    minuteTextBox.value = "55";
    selected_55m = temp;
  };

  // ----------------------
  // HOUR handlers (1 - 24)
  // ----------------------

  const hour_00 = async () => {
    let temp = selected_00h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "00";
    hourTextBox.value = "00";
    selected_00h = temp;
  };

  const hour_1 = async () => {
    let temp = selected_01h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "1";
    hourTextBox.value = "1";
    selected_01h = temp;
  };

  const hour_2 = async () => {
    let temp = selected_02h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "2";
    hourTextBox.value = "2";
    selected_02h = temp;
  };

  const hour_3 = async () => {
    let temp = selected_03h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "3";
    hourTextBox.value = "3";
    selected_03h = temp;
  };

  const hour_4 = async () => {
    let temp = selected_04h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "4";
    hourTextBox.value = "4";
    selected_04h = temp;
  };

  const hour_5 = async () => {
    let temp = selected_05h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "5";
    hourTextBox.value = "5";
    selected_05h = temp;
  };

  const hour_6 = async () => {
    let temp = selected_06h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "6";
    hourTextBox.value = "6";
    selected_06h = temp;
  };

  const hour_7 = async () => {
    let temp = selected_07h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "7";
    hourTextBox.value = "7";
    selected_07h = temp;
  };

  const hour_8 = async () => {
    let temp = selected_08h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "8";
    hourTextBox.value = "8";
    selected_08h = temp;
  };

  const hour_9 = async () => {
    let temp = selected_09h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "09";
    hourTextBox.value = "09";
    selected_09h = temp;
  };

  const hour_10 = async () => {
    let temp = selected_10h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "10";
    hourTextBox.value = "10";
    selected_10h = temp;
  };

  const hour_11 = async () => {
    let temp = selected_11h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "11";
    hourTextBox.value = "11";
    selected_11h = temp;
  };

  const hour_12 = async () => {
    let temp = selected_12h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "12";
    hourTextBox.value = "12";
    selected_12h = temp;
  };

  const hour_13 = async () => {
    let temp = selected_02h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "13";
    hourTextBox.value = "13";
    selected_13h = temp;
  };

  const hour_14 = async () => {
    let temp = selected_14h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "14";
    hourTextBox.value = "14";
    selected_14h = temp;
  };

  const hour_15 = async () => {
    let temp = selected_15h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "15";
    hourTextBox.value = "15";
    selected_15h = temp;
  };

  const hour_16 = async () => {
    let temp = selected_16h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "16";
    hourTextBox.value = "16";
    selected_16h = temp;
  };

  const hour_17 = async () => {
    let temp = selected_17h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "17";
    hourTextBox.value = "17";
    selected_17h = temp;
  };

  const hour_18 = async () => {
    let temp = selected_18h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "18";
    hourTextBox.value = "18";
    selected_18h = temp;
  };

  const hour_19 = async () => {
    let temp = selected_19h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "19";
    hourTextBox.value = "19";
    selected_19h = temp;
  };

  const hour_20 = async () => {
    let temp = selected_20h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "20";
    hourTextBox.value = "20";
    selected_20h = temp;
  };

  const hour_21 = async () => {
    let temp = selected_21h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "21";
    hourTextBox.value = "21";
    selected_21h = temp;
  };

  const hour_22 = async () => {
    let temp = selected_22h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "22";
    hourTextBox.value = "22";
    selected_22h = temp;
  };

  const hour_23 = async () => {
    let temp = selected_23h === "" ? "circle-me" : "";
    await clearAllSelected();
    hourdisplay.innerHTML = "23";
    hourTextBox.value = "23";
    selected_23h = temp;
  };








</script>

{#if show}

<div
    transition:fade={{ duration: 350 }}
    class="modal"
    style="width: {width}; height: {height}"
    id="modal" 
  >
    
  <div class="modal-guts">
      <!-- beg-of-wc -->

      <!-- hour header -->
      <div class="digital-container">
      
        <span on:click={durationpanel} bind:this={durationdisplay} id="duration-digit">24</span>

        <span style="color:#000000;">:</span>

        <span on:click={hour24panel} bind:this={hourdisplay} id="show-24-hour"
          >12</span
        >
        <!-- minutes headder -->
        <span style="color:#000000;">:</span>

        <span on:click={minutepanel} bind:this={minutedisplay} id="show-minutes"
          >27</span
        >
      </div>

    {#if show}

    <div class="watch-container">
      
      {#if durationCapture}
      
      <div>clicked</div>
      <div class="watch">


      </div>
      
      
      {/if}



      <div class="watch">
        
          <card bind:this={hour12card} id="hour12-card">
            <div class="numbers">
              <span on:click={hour_9} style="float:left;" class={selected_09h} id="9h"
                >9</span
              ><span
                on:click={hour_3}
                style="float:right;"
                class={selected_03h}
                id="3h">3</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(30deg);">
              <span
                on:click={hour_10}
                style="float:left; -webkit-transform:rotateZ(-30deg);"
                class={selected_10h}
                id="10h">10</span
              ><span
                on:click={hour_4}
                style="float:right; -webkit-transform:rotateZ(-30deg);"
                class={selected_04h}
                id="4h">4</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(60deg);">
              <span
                on:click={hour_11}
                style="float:left; -webkit-transform:rotateZ(-60deg);"
                class={selected_11h}
                id="11h">11</span
              ><span
                on:click={hour_5}
                style="float:right; -webkit-transform:rotateZ(-60deg);"
                class={selected_05h}
                id="5h">5</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(90deg);">
              <span
                on:click={hour_12}
                style="float:left; -webkit-transform:rotateZ(-90deg);"
                class={selected_12h}
                id="12h">12</span
              ><span
                on:click={hour_6}
                style="float:right; -webkit-transform:rotateZ(-90deg);"
                class={selected_06h}
                id="6h">6</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(120deg);">
              <span
                on:click={hour_1}
                style="float:left; -webkit-transform:rotateZ(-120deg);"
                class={selected_01h}
                id="1h">1</span
              ><span
                on:click={hour_7}
                style="float:right; -webkit-transform:rotateZ(-120deg);"
                class={selected_07h}
                id="7h">7</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(150deg);">
              <span on:click={hour_2}
                style="float:left; -webkit-transform:rotateZ(-150deg);"
                class={selected_02h}
                id="2h">2</span>
                <span on:click={hour_8}
                style="float:right; -webkit-transform:rotateZ(-150deg);"
                class={selected_08h}
                id="8h">8</span>
            </div>
          </card>


          <div class="inner-watch">

            <card bind:this={durationcard} id="duration-card">
            
            </card>


            <card bind:this={hour24card} id="hour24-card">

              <div class="numbers">
                <span
                  on:click={hour_21}
                  style="float:left;"
                  class={selected_21h}
                  id="21h">21</span
                ><span
                  on:click={hour_15}
                  style="float:right;"
                  class={selected_15h}
                  id="15h">15</span
                >
              </div>
      
              <div class="numbers" style="-webkit-transform:rotateZ(30deg);">
                <span
                  on:click={hour_22}
                  style="float:left; -webkit-transform:rotateZ(-30deg);"
                  class={selected_22h}
                  id="22h">22</span
                ><span
                  on:click={hour_16}
                  style="float:right; -webkit-transform:rotateZ(-30deg);"
                  class={selected_16h}
                  id="16h">16</span
                >
              </div>
      
              <div class="numbers" style="-webkit-transform:rotateZ(60deg);">
                <span
                  on:click={hour_23}
                  style="float:left; -webkit-transform:rotateZ(-60deg);"
                  class={selected_23h}
                  id="23h">23</span
                ><span
                  on:click={hour_17}
                  style="float:right; -webkit-transform:rotateZ(-60deg);"
                  class={selected_17h}
                  id="17h">17</span
                >
              </div>
      
              <div class="numbers" style="-webkit-transform:rotateZ(90deg);">
                <span
                  on:click={hour_00}
                  style="float:left; -webkit-transform:rotateZ(-90deg);"
                  class={selected_00h}
                  id="00h">00</span
                ><span
                  on:click={hour_18}
                  style="float:right; -webkit-transform:rotateZ(-90deg);"
                  class={selected_18h}
                  id="18h">18</span
                >
              </div>
      
              <div class="numbers" style="-webkit-transform:rotateZ(120deg);">
                <span
                  on:click={hour_13}
                  style="float:left; -webkit-transform:rotateZ(-120deg);"
                  class={selected_13h}
                  id="13h">13</span
                ><span
                  on:click={hour_19}
                  style="float:right; -webkit-transform:rotateZ(-120deg);"
                  class={selected_19h}
                  id="19h">19</span
                >
              </div>
      
              <div class="numbers" style="-webkit-transform:rotateZ(150deg);">
                <span
                  on:click={hour_14}
                  style="float:left; -webkit-transform:rotateZ(-150deg);"
                  class={selected_14h}
                  id="14h">14</span
                ><span
                  on:click={hour_20}
                  style="float:right; -webkit-transform:rotateZ(-150deg);"
                  class={selected_20h}
                  id="20h">20</span
                >
              </div>
            </card>
          </div>
      
          <card bind:this={minutecard} id="minute-card">
            <div class="numbers">
              <span
                on:click={minute_45}
                style="float:left;"
                class={selected_45m}
                id="45m">45
              </span>
              <span
                on:click={minute_15}
                style="float:right;"
                class={selected_15m}
                id="15m">15
              </span>
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(30deg);">
              <span
                on:click={minute_50}
                style="float:left; -webkit-transform:rotateZ(-30deg);"
                class={selected_50m}
                id="50m">50</span
              ><span
                on:click={minute_20}
                style="float:right; -webkit-transform:rotateZ(-30deg);"
                class={selected_20m}
                id="20m">20</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(60deg);">
              <span
                on:click={minute_55}
                style="float:left; -webkit-transform:rotateZ(-60deg);"
                class={selected_55m}
                id="55m">55</span
              ><span
                on:click={minute_25}
                style="float:right; -webkit-transform:rotateZ(-60deg);"
                class={selected_25m}
                id="25m">25</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(90deg);">
              <span
                on:click={minute_00}
                style="float:left; -webkit-transform:rotateZ(-90deg);"
                class={selected_00m}
                id="00m">00</span
              ><span
                on:click={minute_30}
                style="float:right; -webkit-transform:rotateZ(-90deg);"
                class={selected_30m}
                id="30m">30</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(120deg);">
              <span
                on:click={minute_05}
                style="float:left; -webkit-transform:rotateZ(-120deg);"
                class={selected_05m}
                id="5m">5</span
              ><span
                on:click={minute_35}
                style="float:right; -webkit-transform:rotateZ(-120deg);"
                class={selected_35m}
                id="35m">35</span
              >
            </div>
      
            <div class="numbers" style="-webkit-transform:rotateZ(150deg);">
              <span
                on:click={minute_10}
                style="float:left; -webkit-transform:rotateZ(-150deg);"
                class={selected_10m}
                id="10m">10
              </span>
              <span
                on:click={minute_40}
                style="float:right; -webkit-transform:rotateZ(-150deg);"
                class={selected_40m}
                id="40m">40
              </span>
            </div>
      
          </card>
          
        </div>
        
        <!-- <button class="save-button" on:click={close}>Sav2e</button> -->
        
      </div>
     


      {/if}


      <div>
        <button class="save-button" on:click={close}>Save</button>
      </div>

      <!-- nori: these should be hidden or completely gone after development -->
      <div> <input bind:this={durTextBox} id='durtime' type='text' name='shiftdur' value="24" hidden/> </div>
      <div> <input bind:this={hourTextBox} id='hourtime' type='text' name='shifthour' value="08" hidden/> </div>
      <div> <input bind:this={minuteTextBox} id='minutetime' type='text' name='shiftminute' value="00" hidden/> </div>

      <!-- end-of-wc -->

      <slot />
    </div>

    <!-- // X close button
      <span class="close-button" on:click={close} role="button">
      <slot name="close">
        <svg
          height="12px"
          width="12px"
          viewBox="0 0 47.971 47.971"
          style="enable-background:new 0 0 47.971 47.971;"
        >
          <g>
            <path d={closePath} />
          </g>
        </svg>
      </slot>
    </span> 
    -->


  </div>

  <div class="modal-overlay" id="modal-overlay" on:click={close} />


{/if}

<style>
  .modal {
    display: flex;
    max-width: 100%;
    max-height: 100%;
    position: fixed;
    z-index: 100;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: white;
    box-shadow: 0 0 60px 10px rgba(0, 0, 0, 0.1);
  }
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 50;
    background: rgba(64, 63, 63, 0.6);
  }
  .modal-guts {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: 20px 50px 20px 20px;
  }

  .modal .close-button {
    position: absolute;
    z-index: 1;
    top: 15px;
    right: 15px;
    cursor: pointer;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* TimePicker below */

  .save-button {

    margin: 0;
  position: absolute;
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);

    margin: auto;
    text-align: center;
    width: 90%;
    border: 2px solid navy;
    padding: 7px;
    
  }
  .circle-me {
    position: relative;
    width: 60px;
    line-height: 60px;
    border-radius: 50%;
    text-align: center;
    font-size: 32px;
    /*   border: 3px solid #fff; */
    background: black;
    color: #fff;
    z-index: 9999;
  }

  .digital-container {
    position: relative;
    width: 350px;
    height: 50px;
    text-align: center;
    font-family: "Roboto", sans-serif;
    font-size: 50px;
    font-weight: bold;
    padding-bottom: 5px;
    /* border: 1px solid black; */
    /* background-color: rgb(239, 224, 88); */
  }
  body {
    font-family: "Roboto";
    font-size: 0.9 rem;
  }

  .watch-container {
    position: relative;
    width: 350px;
    height: 430px;
    /*   border: 1px solid black; */
  }
  .watch {
    position: absolute;
    width: 95%;
    height: 79%;
    border: 1px solid rgb(195, 209, 219);
    background-color: rgb(240, 242, 242);
    border-radius: 50%;
    left: 2%;
    top: 10%;
  }
  .inner-watch {
    position: relative;
    width: 68%;
    height: 70%;
    border-radius: 50%;
    background: rgb(195, 209, 219);
    border: 1px solid rgb(210, 210, 210);
    left: 15%;
    top: 15%;
  }
  .numbers {
    position: absolute;
    display: block;
    height: 10%; /* 6 */
    width: 99%;
    top: 44%;
    left: 0%;
    padding: 12px 16px;
    z-index: 1;
  }

</style>
