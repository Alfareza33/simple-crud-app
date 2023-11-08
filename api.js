const express = require('express')
const bodyParser = require('body-parser')

const client = require('./connection')
const app = express()

app.use(bodyParser.json())

app.listen(3100, ()=> {
    console.log('Server running in port 3100')
})

client.connect(err => {
    if(err){
        console.log(err.message)
    } else {
        console.log('Connected')
    }
})

// Menampilakan Location Data
app.get('/locations', (req,res)=>{
  client.query('Select * from locations', (err, result)=>{
      if(!err){
          res.send(result.rows)
      }
  })
})

// Menampilakn Menus Data
app.get('/menus', (req,res)=>{
  client.query('Select * from menus', (err, result)=>{
      if(!err){
          res.send(result.rows)
      }
  })
})

// Add / edit / remove item from Cart
app.post('/cart', (req, res) => {
  const { user_id, product_id, quantity, price, created_at } = req.body;

  const total_price = quantity * price; 

  const query = `INSERT INTO cart (user_id, product_id, quantity, price, total_price, created_at) VALUES ($1, $2, $3, $4, $5, $6)`;
  const values = [user_id, product_id, quantity, price, total_price, created_at];

  client.query(query, values, (err, result) => {
    if (!err) {
      res.send('Insert Success');
    } else {
      res.send(err.message);
    }
  });
});

app.delete('/cart/:id', (req, res) => {
  const cartId = req.params.id;

  client.query('DELETE FROM cart WHERE cart_id = $1', [cartId], (err, result) => {
    if (!err) {
      res.send('Delete Success');
    } else {
      res.send(err.message);
    }
  });
});

app.put('/cart/:id', (req, res) => {
  const { product_id, quantity, price } = req.body;

  const total_price = quantity * price

  client.query((`Update cart set product_id = '${product_id}', quantity = '${quantity}', price = '${price}', total_price = '${total_price}' where cart_id = '${req.params.id}'`), (err, result)=>{
      if (!err) {
              res.send('Update Success');
          } else {
              res.send(err.message);
          }
      })
})


// Checkout
app.post('/checkout/:cart_id', (req, res) => {
  const cartId = req.params.cart_id;

  // Ambil item dari keranjang pengguna
  const querySelect = `SELECT * FROM cart WHERE cart_id = ${cartId}`;
  
  client.query(querySelect, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Gagal mengambil item dari keranjang' });
    }

    const cartItems = result.rows;

    // Hitung total harga belanjaan
    let totalAmount = 0;
    for (const item of cartItems) {
      totalAmount += item.price * item.quantity;
    }

    // Buat catatan transaksi
    const transactionQuery = `
      INSERT INTO transactions (cart_id, total_amount, transaction_date)
      VALUES (${cartId}, ${totalAmount}, NOW())
    `;

    client.query(transactionQuery, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Gagal membuat catatan transaksi' });
      }

      // Hapus item dari keranjang setelah checkout
      const deleteQuery = `DELETE FROM cart WHERE cart_id = ${cartId}`;
      client.query(deleteQuery, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Gagal menghapus item dari keranjang' });
        }

        res.json({ message: 'Checkout berhasil' });
      });
    });
  });
});


  